import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const runtime = 'edge';

const SUMMARIZE_MODEL = openai("gpt-4o-mini");

interface SummarizeRequest {
  title?: string;
  content?: string[];
}

export async function POST(req: Request) {
  try {
    const { title = "", content = [] }: SummarizeRequest = await req.json();

    if (!Array.isArray(content) || content.length === 0) {
      return NextResponse.json(
        { error: "Content is required to summarize." },
        { status: 400 }
      );
    }

    const joinedContent = content.join("\n");
    const summaryPrompt = [
      "You are helping to consolidate user's long notes into a concise summary.",
      "Summarize the following content briefly but completely. Include only the most important information.",
      "Return only the summary text with no introductions or bullet labels."
    ].join(" ");

    const { text } = await generateText({
      model: SUMMARIZE_MODEL,
      prompt: `${summaryPrompt}\n\nTitle: ${title || "Untitled"}\nContent:\n${joinedContent}`
    });

    return NextResponse.json({ summary: text.trim() });
  } catch (error) {
    console.error("Failed to summarize prompt card content:", error);
    return NextResponse.json(
      { error: "Failed to summarize content." },
      { status: 500 }
    );
  }
}

