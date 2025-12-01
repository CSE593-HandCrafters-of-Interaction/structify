import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const SUGGEST_MODEL = google("models/gemini-flash-latest");

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
    const { cards = [], focusCardId }: SuggestRequest = await req.json();

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

    const instruction = [
      "You are helping a user design structured prompt cards for an LLM.",
      "Each card has a title and content. Content is one of two types:",
      '- BULLET: { "type": "bullet", "items": ["item 1", "item 2", ...] }',
      '- SLIDER: { "type": "slider", "value": 200, "min": 100, "max": 300, "step": 10 }',
      "",
      "The user clicked `Suggest` on one specific FOCUS card.",
      "",
      "Your job:",
      "- Improve the FOCUS card's content (make it clearer, more specific, more actionable).",
      "- Keep the FOCUS card's content type sensible:",
      "  * Use BULLET for lists of tones, restrictions, style guidelines, etc.",
      "  * Use SLIDER for numeric ranges such as length, number of items, score thresholds, etc.",
      "- Optionally adjust other existing cards ONLY if they obviously conflict or can be obviously improved.",
      "- Optionally propose up to 3 NEW cards for helpful dimensions such as:",
      "  Tone, Length, Restriction, Audience, Structure, Style, Examples, etc.",
      "",
      "VERY IMPORTANT OUTPUT FORMAT:",
      "- You MUST output a single valid JSON object with this shape:",
      '  { "suggestions": [',
      "      {",
      '        "cardId": "existing-card-id-or-null",',
      '        "title": "Optional new title",',
      '        "content": {',
      '          "type": "bullet",',
      '          "items": ["item 1", "item 2"]',
      "        },",
      '        "isIncluded": true',
      "      },",
      "      {",
      '        "cardId": "existing-card-id-or-null",',
      '        "title": "Optional new title",',
      '        "content": {',
      '          "type": "slider",',
      '          "value": 200,',
      '          "min": 100,',
      '          "max": 300,',
      '          "step": 10',
      "        },",
      '        "isIncluded": false',
      "      }",
      "    ]",
      "  }",
      "- For EXISTING cards: use their cardId string.",
      "- For NEW cards: set cardId to null and ALWAYS provide a title and a content object.",
      "- Omit fields you don't change (e.g., if you don't change title, you can skip it).",
      "- Do NOT wrap JSON in markdown code fences.",
      "- Do NOT add any explanations outside the JSON.",
      "",
      "Constraints:",
      "- At least ONE suggestion MUST be for the FOCUS card (rewrite its content).",
      "- You only modify other existing cards if they obviously conflict or can be obviously improved.",
      "- You may modify at most 5 existing cards.",
      "- You may create at most 3 new cards.",
      "- Keep the user's language consistent with the original.",
    ].join("\n");

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
      model: SUGGEST_MODEL,
      prompt: `${instruction}\n\n${focusIntro}`,
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
