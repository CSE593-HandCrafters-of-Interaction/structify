// app/api/suggest/route.ts
import { NextResponse } from "next/server";

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
    const { cards, focusCardId }: SuggestRequest = await req.json();

    if (!Array.isArray(cards)) {
      return NextResponse.json(
        { error: "cards must be an array" },
        { status: 400 },
      );
    }

    const focusCard = cards.find((c) => c.id === focusCardId) ?? cards[0];

    if (!focusCard) {
      return NextResponse.json<SuggestResponse>({ suggestions: [] });
    }

    const baseContent = Array.isArray(focusCard.content)
      ? focusCard.content
      : [];

    const suggestion: Suggestion = {
      cardId: focusCard.id,
      content: [
        ...baseContent,
        "💡 (Placeholder) This line was added by /api/suggest. Replace this with real LLM suggestions later.",
      ],
    };

    const response: SuggestResponse = {
      suggestions: [suggestion],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to handle suggest request:", error);
    return NextResponse.json(
      { error: "Failed to handle suggest request." },
      { status: 500 },
    );
  }
}
