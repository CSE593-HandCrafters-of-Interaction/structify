import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const SUGGEST_MODEL = openai("gpt-5-mini");

interface SuggestCard {
  id: string;
  title: string;
  content: string[];
  isIncluded: boolean;
}

interface SuggestRequest {
  cards: SuggestCard[];
  focusCardId?: string;
}

interface SuggestionPatch {
  cardId: string | null;
  title?: string;
  content?: string[];
  isIncluded?: boolean;
}

interface SuggestResponse {
  suggestions: SuggestionPatch[];
}

function parseSuggestions(raw: string): SuggestionPatch[] {
  try {
    const trimmed = raw.trim();

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return [];

    const jsonText = trimmed.slice(start, end + 1);
    const parsed = JSON.parse(jsonText) as Partial<SuggestResponse>;

    if (!parsed || !Array.isArray(parsed.suggestions)) return [];

    return parsed.suggestions
      .map((s): SuggestionPatch | null => {
        if (typeof s !== "object" || s == null) return null;

        const cardId =
          typeof (s as any).cardId === "string" || (s as any).cardId === null
            ? (s as any).cardId
            : null;

        const title =
          typeof (s as any).title === "string" &&
          (s as any).title.trim().length > 0
            ? (s as any).title.trim()
            : undefined;

        const contentArray = Array.isArray((s as any).content)
          ? (s as any).content
              .map((line: unknown) =>
                typeof line === "string" ? line.trim() : "",
              )
              .filter((line: string) => line.length > 0)
          : undefined;

        const isIncluded =
          typeof (s as any).isIncluded === "boolean"
            ? (s as any).isIncluded
            : undefined;

        if (!title && (!contentArray || contentArray.length === 0) && isIncluded === undefined) {
          return null;
        }

        return {
          cardId,
          title,
          content: contentArray,
          isIncluded,
        };
      })
      .filter((s): s is SuggestionPatch => s !== null);
  } catch (error) {
    console.error("Failed to parse suggestions JSON:", error);
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
        const contentText =
          Array.isArray(card.content) && card.content.length > 0
            ? card.content.join("\n")
            : "(empty)";
        return [
          `Card ID: ${card.id}`,
          `Title: ${card.title || "(Untitled)"}`,
          `Status: ${includedLabel}`,
          `Content:`,
          contentText,
        ].join("\n");
      })
      .join("\n\n---\n\n");

    const instruction = [
      "You are helping a user design structured prompt cards for an LLM.",
      "Each card has a title and content. The user clicked `Suggest` on one specific FOCUS card.",
      "",
      "Your job:",
      "- Improve the FOCUS card's content (make it clearer, more specific, more actionable).",
      "- Optionally adjust other existing cards if they obviously conflict or can be improved.",
      "- Optionally propose up to 3 NEW cards for helpful dimensions such as:",
      "  Tone, Length, Restriction, Audience, Structure, Style, Examples, etc.",
      "",
      "VERY IMPORTANT OUTPUT FORMAT:",
      "- You MUST output a single valid JSON object with this shape:",
      '  { "suggestions": [',
      '      {',
      '        "cardId": "existing-card-id-or-null",',
      '        "title": "Optional new title",',
      '        "content": ["line 1", "line 2", "..."],',
      '        "isIncluded": true',
      "      },",
      "      ...",
      "    ]",
      "  }",
      "- For EXISTING cards: use their cardId string.",
      "- For NEW cards: set cardId to null and ALWAYS provide a title and content.",
      "- Omit fields you don't change (e.g., if you don't change title, you can skip it).",
      "- Do NOT wrap JSON in markdown code fences.",
      "- Do NOT add any explanations outside the JSON.",
      "",
      "Constraints:",
      "- At least ONE suggestion MUST be for the FOCUS card (rewrite its content).",
      "- You may modify at most 5 existing cards.",
      "- You may create at most 3 new cards.",
      "- Keep the user's language (Chinese or English) consistent with the original.",
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
