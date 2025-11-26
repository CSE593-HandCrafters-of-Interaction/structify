import { google } from "@ai-sdk/google";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import chatPrompt from "@/data/chatPrompt.json";

const CHAT_MODEL = google("gemini-3-pro-preview");
const systemPrompt = chatPrompt.lines.join("\n");

type ChatRequestBody = {
  messages: UIMessage[];
  userStudyMode?: boolean;
};

export async function POST(req: Request) {
  const { messages, userStudyMode = true }: ChatRequestBody = await req.json();

  const result = streamText({
    model: CHAT_MODEL,
    messages: convertToModelMessages(messages),
    ...(userStudyMode ? { system: systemPrompt } : {}),
  });

  return result.toUIMessageStreamResponse();
}
