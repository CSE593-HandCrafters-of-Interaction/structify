import { NextResponse } from "next/server";
import { generateText } from "ai";
import suggestInstruction from "@/data/suggest-instruction.json";
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

interface SuggestCard {
  id: string;
  title: string;
  content: IncomingContent;
  isIncluded: boolean;
}

interface SuggestRequest {
  cards: SuggestCard[];
  focusCardId?: string;
  instruction?: string;
  provider?: ModelProvider;
  modelId?: string;
  apiKey?: string;
}

export interface SuggestionPatch {
  cardId: string | null;
  title?: string;
  content?: CardContent;
  isIncluded?: boolean;
}

export interface SuggestResponse {
  suggestions: SuggestionPatch[];
}

function normalizeCardContent(raw: IncomingContent): CardContent | undefined {
  if (Array.isArray(raw)) {
    const items = raw
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter((line) => line.length > 0);
    if (!items.length) return undefined;
    return { type: "bullet", items };
  }

  if (!raw || typeof raw !== "object") return undefined;

  // raw is now guaranteed to be CardContent
  const cardRaw = raw as CardContent;

  if (cardRaw.type === "bullet") {
    const rawItems = cardRaw.items;
    if (!Array.isArray(rawItems)) return undefined;
    const items = rawItems
      .map((line: unknown) =>
        typeof line === "string" ? line.trim() : "",
      )
      .filter((line: string) => line.length > 0);
    if (!items.length) return undefined;
    return { type: "bullet", items };
  }

  if (cardRaw.type === "slider") {
    const toNumber = (v: unknown): number | undefined =>
      typeof v === "number" && Number.isFinite(v) ? v : undefined;

    let value = toNumber(cardRaw.value);
    let min = toNumber(cardRaw.min);
    let max = toNumber(cardRaw.max);
    let step = toNumber(cardRaw.step);

    if (min === undefined && max === undefined && value !== undefined) {
      min = Math.max(0, Math.floor(value * 0.5));
      max = Math.ceil(value * 1.5);
    }
    if (min === undefined) min = 0;
    if (max === undefined) max = min + 100;
    if (value === undefined) value = Math.min(Math.max(min, 0), max);
    if (step === undefined || step <= 0) {
      step = Math.max(1, Math.round((max - min) / 10));
    }

    if (max < min) {
      const tmp = max;
      max = min;
      min = tmp;
    }

    if (value < min) value = min;
    if (value > max) value = max;

    return {
      type: "slider",
      value,
      min,
      max,
      step,
    };
  }

  return undefined;
}

function formatContentForPrompt(
  content: IncomingContent,
): { typeLabel: string; text: string } {
  const normalized = normalizeCardContent(content);
  if (!normalized) {
    return {
      typeLabel: "none",
      text: "(empty)",
    };
  }

  if (normalized.type === "bullet") {
    return {
      typeLabel: "bullet",
      text: normalized.items.map((item) => `- ${item}`).join("\n"),
    };
  }

  return {
    typeLabel: "slider",
    text: [
      `value: ${normalized.value}`,
      `min: ${normalized.min}`,
      `max: ${normalized.max}`,
      `step: ${normalized.step}`,
    ].join("\n"),
  };
}

function parseSuggestions(raw: string): SuggestionPatch[] {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return [];

    const jsonText = trimmed.slice(start, end + 1);
    const parsed = JSON.parse(jsonText) as Partial<SuggestResponse>;

    if (!parsed || !Array.isArray(parsed.suggestions)) return [];

    return parsed.suggestions
      .map((s): SuggestionPatch | null => {
        if (typeof s !== "object" || s == null) return null;

        const rawCardId = s.cardId;
        const cardId =
          typeof rawCardId === "string" || rawCardId === null
            ? rawCardId
            : null;

        const rawTitle = s.title;
        const title =
          typeof rawTitle === "string" && rawTitle.trim().length > 0
            ? rawTitle.trim()
            : undefined;

        const rawContent = s.content as IncomingContent;
        const content = normalizeCardContent(rawContent);

        const rawIncluded = s.isIncluded;
        const isIncluded =
          typeof rawIncluded === "boolean" ? rawIncluded : undefined;

        if (!title && !content && isIncluded === undefined) {
          return null;
        }

        return {
          cardId,
          title,
          content,
          isIncluded,
        };
      })
      .filter((s): s is SuggestionPatch => s !== null);
  } catch (error) {
    console.error("[suggest] Failed to parse suggestions JSON:", error);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { 
      cards = [], 
      focusCardId, 
      instruction,
      provider = "google",
      modelId = "models/gemini-flash-latest",
      apiKey,
    }: SuggestRequest = await req.json();

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

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        { error: "cards is required and must be a non-empty array." },
        { status: 400 },
      );
    }

    const focusCard =
      cards.find((c) => c.id === focusCardId) ?? cards[0];

    if (!focusCard) {
      return NextResponse.json<SuggestResponse>({ suggestions: [] });
    }

    const cardsDescription = cards
      .map((card) => {
        const includedLabel = card.isIncluded ? "included" : "excluded";
        const { typeLabel, text } = formatContentForPrompt(card.content);

        return [
          `Card ID: ${card.id}`,
          `Title: ${card.title || "(Untitled)"}`,
          `Status: ${includedLabel}`,
          `Content type: ${typeLabel}`,
          `Content:`,
          text,
        ].join("\n");
      })
      .join("\n\n---\n\n");

    const instructionText = instruction || suggestInstruction.lines.join("\n");

    const focusIntro = [
      "Below are all current cards:",
      "",
      cardsDescription,
      "",
      `FOCUS CARD ID: ${focusCard.id}`,
      `FOCUS CARD TITLE: ${focusCard.title || "(Untitled)"}`,
      "",
      "Now respond with the JSON object described above.",
    ].join("\n");

    const { text } = await generateText({
      model,
      prompt: `${instructionText}\n\n${focusIntro}`,
    });

    const raw = (text || "").trim();
    if (!raw) {
      return NextResponse.json<SuggestResponse>({ suggestions: [] });
    }

    const suggestions = parseSuggestions(raw);

    if (suggestions.length === 0) {
      return NextResponse.json<SuggestResponse>({ suggestions: [] });
    }

    return NextResponse.json<SuggestResponse>({ suggestions });
  } catch (error) {
    console.error("Failed to handle suggest request:", error);
    return NextResponse.json(
      { error: "Failed to handle suggest request." },
      { status: 500 },
    );
  }
}
