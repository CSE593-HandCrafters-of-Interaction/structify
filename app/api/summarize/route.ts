import { NextResponse } from "next/server";
import { generateText } from "ai";
import summarizeInstruction from "@/data/summarize-instruction.json";
import { getModelInstance } from "@/lib/model-utils";
import type { ModelProvider } from "@/lib/localStorage-settings-adapter";

type BulletContent = {
  type: "bullet";
  items: string[];
};

type SliderContent = {
  type: "slider";
  value: number;
  min: number;
  max: number;
  step: number;
};

type CardContent = BulletContent | SliderContent;

type IncomingContent = string[] | CardContent | null | undefined;

interface SummarizeRequest {
  title?: string;
  content?: IncomingContent;
  instruction?: string;
  provider?: ModelProvider;
  modelId?: string;
  apiKey?: string;
}

interface SummarizeResponse {
  summary: CardContent;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isBulletContent(value: any): value is BulletContent {
  return (
    value &&
    typeof value === "object" &&
    value.type === "bullet" &&
    Array.isArray(value.items)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSliderContent(value: any): value is SliderContent {
  return (
    value &&
    typeof value === "object" &&
    value.type === "slider" &&
    typeof value.value === "number" &&
    typeof value.min === "number" &&
    typeof value.max === "number" &&
    typeof value.step === "number"
  );
}

function extractBulletItems(content: IncomingContent): string[] {
  if (Array.isArray(content)) {
    return content
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter((line) => line.length > 0);
  }

  if (isBulletContent(content)) {
    return (content.items || [])
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter((line) => line.length > 0);
  }

  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractJsonObject(text: string): any | null {
  try {
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    const jsonText = trimmed.slice(start, end + 1);
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("[summarize] Failed to parse JSON:", e);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeModelOutput(json: any, fallback: BulletContent): CardContent {
  if (!json || typeof json !== "object") {
    return fallback;
  }

  if (json.type === "slider") {
    const v = Number(json.value);
    const min = Number(json.min);
    const max = Number(json.max);
    let step = Number(json.step);

    if (!Number.isFinite(v) || !Number.isFinite(min) || !Number.isFinite(max)) {
      return fallback;
    }

    let value = Math.round(v);
    let minVal = Math.round(min);
    let maxVal = Math.round(max);

    if (maxVal < minVal) {
      const tmp = maxVal;
      maxVal = minVal;
      minVal = tmp;
    }

    if (!Number.isFinite(step) || step <= 0) {
      step = Math.max(1, Math.round((maxVal - minVal) / 10) || 1);
    }

    if (value < minVal) value = minVal;
    if (value > maxVal) value = maxVal;

    const slider: SliderContent = {
      type: "slider",
      value,
      min: minVal,
      max: maxVal,
      step,
    };
    return slider;
  }

  if (json.type === "bullet" && Array.isArray(json.items)) {
    const items = (json.items as unknown[])
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter((line) => line.length > 0);

    if (!items.length) return fallback;

    const bullet: BulletContent = {
      type: "bullet",
      items,
    };
    return bullet;
  }

  return fallback;
}


export async function POST(req: Request) {
  try {
    const { 
      title = "", 
      content, 
      instruction,
      provider = "google",
      modelId = "models/gemini-flash-latest",
      apiKey,
    }: SummarizeRequest = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    let model;
    try {
      model = getModelInstance(provider, modelId, apiKey);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to create model" },
        { status: 400 }
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
      const response: SummarizeResponse = { summary: slider };
      return NextResponse.json(response);
    }

    const bulletItems = extractBulletItems(content);
    if (!bulletItems.length) {
      return NextResponse.json(
        { error: "Content is required to summarize." },
        { status: 400 },
      );
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
      const fallback: SummarizeResponse = { summary: fallbackBullet };
      return NextResponse.json(fallback);
    }

    const json = extractJsonObject(raw);
    const summary = normalizeModelOutput(json, fallbackBullet);

    const response: SummarizeResponse = { summary };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to summarize prompt card content:", error);
    return NextResponse.json(
      { error: "Failed to summarize content." },
      { status: 500 },
    );
  }
}
