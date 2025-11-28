// app/api/suggest/route.ts
import { NextResponse } from "next/server";

interface SuggestCard {
  id: string;
  title?: string;
  content?: string[];
  isIncluded?: boolean;
}

interface SuggestRequest {
  cards: SuggestCard[];
  focusCardId?: string;
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

    console.log("[suggest] received request", {
      focusCardId,
      cardCount: cards.length,
    });

    return NextResponse.json({
      suggestions: [],
    });
  } catch (error) {
    console.error("Failed to handle suggest request:", error);
    return NextResponse.json(
      { error: "Failed to handle suggest request." },
      { status: 500 },
    );
  }
}
