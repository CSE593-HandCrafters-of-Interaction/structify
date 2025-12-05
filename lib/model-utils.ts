import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { ModelProvider } from "./localStorage-settings-adapter";

export function getModelInstance(
  provider: ModelProvider,
  modelId: string,
  apiKey: string,
): LanguageModel {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(`API key for ${provider} is not configured`);
  }

  switch (provider) {
    case "google": {
      const googleProvider = createGoogleGenerativeAI({ apiKey });
      return googleProvider(modelId);
    }
    case "openai": {
      const openaiProvider = createOpenAI({ apiKey });
      return openaiProvider(modelId);
    }
    case "anthropic":
      // Note: @ai-sdk/anthropic would need to be installed
      // For now, throw an error to indicate it's not supported yet
      throw new Error("Anthropic provider is not yet supported. Please install @ai-sdk/anthropic.");
    case "mistral":
      // Note: @ai-sdk/mistral would need to be installed
      throw new Error("Mistral provider is not yet supported. Please install @ai-sdk/mistral.");
    case "cohere":
      // Note: @ai-sdk/cohere would need to be installed
      throw new Error("Cohere provider is not yet supported. Please install @ai-sdk/cohere.");
    case "xai":
      // Note: @ai-sdk/xai would need to be installed
      throw new Error("xAI provider is not yet supported. Please install @ai-sdk/xai.");
    case "groq":
      // Note: @ai-sdk/groq would need to be installed
      throw new Error("Groq provider is not yet supported. Please install @ai-sdk/groq.");
    case "deepseek":
      // Note: @ai-sdk/deepseek would need to be installed
      throw new Error("DeepSeek provider is not yet supported. Please install @ai-sdk/deepseek.");
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

