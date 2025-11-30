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

    const instruction = [
      "You are helping the user refine a single structured prompt card.",
      "The card has a title and a list of bullet items.",
      "",
      "You must choose the best representation for the card:",
      '- BULLET card: { "type": "bullet", "items": ["...", "..."] }',
      "- Use this when the card expresses constraints, tone, style, audience, examples, etc.",
      "",
      '- SLIDER card: { "type": "slider", "value": 200, "min": 100, "max": 300, "step": 10 }',
      "- Use this when the card mainly defines a numeric quantity or range,",
      '  such as length (e.g. "200 words", "150-250 characters"),',
      '  number of items (e.g. "5-7 bullets"),',
      "  or other numeric thresholds.",
      "",
      "For example:",
      '- Title: "Length", bullets: ["~200 words"] -> choose SLIDER with an appropriate range,',
      "  for example value around 200, a reasonable min and max, and a simple positive step.",
      "",
      "Output requirements:",
      "- Always output a single valid JSON object with exactly one of these shapes:",
      '  { "type": "bullet", "items": ["...", "..."] }',
      '  { "type": "slider", "value": 200, "min": 100, "max": 300, "step": 10 }',
      "- Use integers for slider numbers.",
      "- For bullet items, keep 1–10 short, clear bullets.",
      "- Keep the user's language (Chinese or English) consistent with the original text.",
      "- Do NOT wrap JSON in markdown code fences.",
      "- Do NOT add any explanation outside the JSON.",
    ].join(" ");

    const prompt = [
      instruction,
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
