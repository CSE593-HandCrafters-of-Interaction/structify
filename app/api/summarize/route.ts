import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const SUMMARIZE_MODEL = google("models/gemini-flash-latest");

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
}

interface SummarizeResponse {
  summary: CardContent;
}

function isBulletContent(value: any): value is BulletContent {
  return (
    value &&
    typeof value === "object" &&
    value.type === "bullet" &&
    Array.isArray(value.items)
  );
}

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

function normalizeToBullet(content: IncomingContent): BulletContent | null {
  if (Array.isArray(content)) {
    const items = content
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter((line) => line.length > 0);
    if (!items.length) return null;
    return { type: "bullet", items };
  }

  if (isBulletContent(content)) {
    const items = (content.items || [])
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter((line) => line.length > 0);
    if (!items.length) return null;
    return { type: "bullet", items };
  }

  return null;
}

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

export async function POST(req: Request) {
  try {
    const { title = "", content }: SummarizeRequest = await req.json();

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

    const bullet = normalizeToBullet(content);
    if (!bullet) {
      return NextResponse.json(
        { error: "Content is required to summarize." },
        { status: 400 },
      );
    }

    const bulletText = bullet.items.map((item) => `- ${item}`).join("\n");

    const summaryInstruction = [
      "You are helping the user compress and refine a list of bullet points.",
      "Summarize and rewrite the list to be clearer, more concise, and more actionable.",
      "Preserve the original intent, but you can merge or drop redundant bullets.",
      "",
      "You MUST respond with a single valid JSON object with this shape:",
      '{ "type": "bullet", "items": ["...", "..."] }',
      "Where:",
      '- type is always "bullet".',
      "- items is an array of 1–10 short bullet strings.",
      "",
      "Do NOT wrap the JSON in markdown code fences.",
      "Do NOT add any explanation or text outside the JSON.",
    ].join(" ");

    const prompt = [
      summaryInstruction,
      "",
      `Title: ${title || "Untitled"}`,
      "Original bullets:",
      bulletText || "(empty)",
    ].join("\n");

    const { text } = await generateText({
      model: SUMMARIZE_MODEL,
      prompt,
    });

    const raw = (text || "").trim();
    if (!raw) {
      const fallback: SummarizeResponse = { summary: bullet };
      return NextResponse.json(fallback);
    }

    const json = extractJsonObject(raw);
    if (!json || json.type !== "bullet" || !Array.isArray(json.items)) {
      const fallback: SummarizeResponse = { summary: bullet };
      return NextResponse.json(fallback);
    }

    const summarizedItems = (json.items as unknown[])
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter((line) => line.length > 0);

    if (!summarizedItems.length) {
      const fallback: SummarizeResponse = { summary: bullet };
      return NextResponse.json(fallback);
    }

    const summarizedBullet: BulletContent = {
      type: "bullet",
      items: summarizedItems,
    };

    const response: SummarizeResponse = { summary: summarizedBullet };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to summarize prompt card content:", error);
    return NextResponse.json(
      { error: "Failed to summarize content." },
      { status: 500 },
    );
  }
}
