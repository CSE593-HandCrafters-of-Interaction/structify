import { readFileSync } from "node:fs";
import path from "node:path";
import { openai } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages } from "ai";

export const runtime = 'edge';

const CHAT_MODEL = openai("gpt-4o-mini");

const systemPrompt = readFileSync(
  path.join(process.cwd(), "data/system.txt"),
  "utf-8",
);

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: CHAT_MODEL,
    system: systemPrompt,
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
