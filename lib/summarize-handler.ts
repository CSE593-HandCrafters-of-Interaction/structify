import { generateText } from "ai";
import summarizeInstruction from "@/data/summarize-instruction.json";
import { getModelInstance } from "@/lib/model-utils";
import type { ModelProvider } from "@/lib/localStorage-settings-adapter";
import {
  extractBulletItems,
  extractJsonObject,
  normalizeModelOutput,
  isSliderContent,
} from "./card-content-utils";
import type {
  BulletContent,
  SliderContent,
  CardContent,
  IncomingContent,
} from "./card-content-types";

export interface SummarizeRequest {
  title?: string;
  content?: IncomingContent;
  instruction?: string;
  provider?: ModelProvider;
  modelId?: string;
  apiKey?: string;
}

export interface SummarizeResponse {
  summary: CardContent;
}

export async function handleSummarizeRequest(
  request: SummarizeRequest,
): Promise<SummarizeResponse> {
  const {
    title = "",
    content,
    instruction,
    provider = "google",
    modelId = "models/gemini-flash-latest",
    apiKey,
  } = request;

  if (!apiKey) {
    throw new Error("API key is required");
  }

  let model;
  try {
    model = getModelInstance(provider, modelId, apiKey);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to create model",
    );
  }

  if (isSliderContent(content)) {
    const slider: SliderContent = {
      type: "slider",
      value: content.value,
      min: content.min,
      max: content.max,
      step: content.step,
    };
    return { summary: slider };
  }

  const bulletItems = extractBulletItems(content);
  if (!bulletItems.length) {
    throw new Error("Content is required to summarize.");
  }

  const fallbackBullet: BulletContent = {
    type: "bullet",
    items: bulletItems,
  };

  const bulletText = bulletItems.map((i) => `- ${i}`).join("\n");

  const instructionText = instruction || summarizeInstruction.lines.join("\n");

  const prompt = [
    instructionText,
    "",
    `Title: ${title || "Untitled"}`,
    "Original bullets:",
    bulletText || "(empty)",
  ].join("\n");

  const { text } = await generateText({
    model,
    prompt,
  });

  const raw = (text || "").trim();
  if (!raw) {
    return { summary: fallbackBullet };
  }

  const json = extractJsonObject(raw);
  const summary = normalizeModelOutput(json, fallbackBullet);

  return { summary };
}

