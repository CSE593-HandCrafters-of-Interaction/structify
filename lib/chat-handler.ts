import { streamText, UIMessage, convertToModelMessages } from "ai";
import chatPrompt from "@/data/user-study-system-prompt.json";
import { getModelInstance } from "@/lib/model-utils";
import type { ModelProvider } from "@/lib/localStorage-settings-adapter";

const systemPrompt = chatPrompt.lines.join("\n");

export type ChatRequestBody = {
  messages: UIMessage[];
  userStudyMode?: boolean;
  provider?: ModelProvider;
  modelId?: string;
  apiKey?: string;
};

export async function handleChatRequest(body: ChatRequestBody) {
  const {
    messages,
    userStudyMode = false,
    provider = "google",
    modelId = "gemini-2.5-pro",
    apiKey,
  } = body;

  if (!apiKey) {
    throw new Error("API key is required");
  }

  const model = getModelInstance(provider, modelId, apiKey);

  const result = streamText({
    model,
    messages: convertToModelMessages(messages),
    ...(userStudyMode ? { system: systemPrompt } : {}),
  });

  return result.toUIMessageStreamResponse();
}

