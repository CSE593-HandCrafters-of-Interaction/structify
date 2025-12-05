import { generateText } from "ai";
import suggestInstruction from "@/data/suggest-instruction.json";
import { getModelInstance } from "@/lib/model-utils";
import type { ModelProvider } from "@/lib/localStorage-settings-adapter";
import {
  normalizeCardContent,
  formatContentForPrompt,
} from "./card-content-utils";
import type { CardContent, IncomingContent } from "./card-content-types";

export interface SuggestCard {
  id: string;
  title: string;
  content: IncomingContent;
  isIncluded: boolean;
}

export interface SuggestRequest {
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

export async function handleSuggestRequest(
  request: SuggestRequest,
): Promise<SuggestResponse> {
  const {
    cards = [],
    focusCardId,
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

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("cards is required and must be a non-empty array.");
  }

  const focusCard =
    cards.find((c) => c.id === focusCardId) ?? cards[0];

  if (!focusCard) {
    return { suggestions: [] };
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
    return { suggestions: [] };
  }

  const suggestions = parseSuggestions(raw);

  if (suggestions.length === 0) {
    return { suggestions: [] };
  }

  return { suggestions };
}

