import type { UIMessage } from "ai";

const STORAGE_KEY = "assistant-ui-chat-history";

export const loadChatHistory = (): UIMessage[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    return parsed.messages as UIMessage[];
  } catch (error) {
    console.error("Failed to load chat history from localStorage:", error);
    return null;
  }
};

export const saveChatHistory = (messages: UIMessage[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages,
      })
    );
  } catch (error) {
    console.error("Failed to save chat history to localStorage:", error);
  }
};

