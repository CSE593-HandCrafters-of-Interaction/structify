import { streamText, UIMessage, convertToModelMessages } from "ai";
import chatPrompt from "@/data/user-study-system-prompt.json";
import { getModelInstance } from "@/lib/model-utils";
import type { ModelProvider } from "@/lib/localStorage-settings-adapter";

const systemPrompt = chatPrompt.lines.join("\n");

type ChatRequestBody = {
  messages: UIMessage[];
  userStudyMode?: boolean;
  provider?: ModelProvider;
  modelId?: string;
  apiKey?: string;
};

export async function POST(req: Request) {
  const { 
    messages, 
    userStudyMode = false,
    provider = "google",
    modelId = "gemini-2.5-pro",
    apiKey,
  }: ChatRequestBody = await req.json();

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const model = getModelInstance(provider, modelId, apiKey);

    const result = streamText({
      model,
      messages: convertToModelMessages(messages),
      ...(userStudyMode ? { system: systemPrompt } : {}),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Failed to create chat model:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to create model" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
