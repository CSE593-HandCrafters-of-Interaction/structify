import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const SUGGEST_MODEL = openai("gpt-4o-mini");

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

interface Suggestion {
  cardId: string;
  title?: string;
  content?: string[];
  isIncluded?: boolean;
}

interface SuggestResponse {
  suggestions: Suggestion[];
}

export async function POST(req: Request) {
  try {
    const { cards = [], focusCardId }: SuggestRequest = await req.json();

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        { error: "cards is required and must be a non-empty array." },
        { status: 400 }
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

    const systemInstruction = [
      "You are helping a user design structured prompt cards for an LLM.",
      "Each card has a title and content. The user clicked `Suggest` on one specific card (the FOCUS card).",
      "Your task is to rewrite the content of ONLY the FOCUS card.",
      "Make the content clearer, more specific, and more actionable.",
      "You may introduce helpful constraints, tone, length hints, or examples, but keep everything inside the FOCUS card.",
      "Do not mention that you are rewriting or suggesting. Just output the new content.",
      "Keep the style consistent with the existing cards and the user's language (Chinese or English).",
      "Return ONLY the rewritten content text, no explanations, no JSON, no bullet labels like 'Suggestion:'."
    ].join(" ");

    const focusCardIntro = [
      `Below are all current cards. One of them is marked as FOCUS.`,
      "",
      cardsDescription,
      "",
      `FOCUS CARD ID: ${focusCard.id}`,
      `FOCUS CARD TITLE: ${focusCard.title || "(Untitled)"}`,
      "",
      "Rewrite the content of the FOCUS card now."
    ].join("\n");

    const { text } = await generateText({
      model: SUGGEST_MODEL,
      prompt: `${systemInstruction}\n\n${focusCardIntro}`
    });

    const raw = (text || "").trim();

    if (!raw) {
      return NextResponse.json<SuggestResponse>({ suggestions: [] });
    }

    const newContent = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const suggestion: Suggestion = {
      cardId: focusCard.id,
      content: newContent,
    };

    const response: SuggestResponse = {
      suggestions: [suggestion],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to handle suggest request:", error);
    return NextResponse.json(
      { error: "Failed to handle suggest request." },
      { status: 500 }
    );
  }
}
