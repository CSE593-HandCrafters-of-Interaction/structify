const PROMPT_PREFIX_KEY = "structify-prompt-prefix";

export const DEFAULT_PROMPT_PREFIX = `You will now receive a unified set of structured instructions.
They are organized into titled sections. Each section contains
bullet points that define requirements, constraints, or examples.

Interpret every section as part of one cohesive prompt.
Titles are for organization only — not separate tasks.
Respect the user's language preferences and respond in the same language.

After reading all sections, follow the FINAL INSTRUCTION section.
Do not repeat or restate the instructions unless explicitly asked.

`;

export const loadPromptPrefix = (): string => {
  if (typeof window === "undefined") {
    return DEFAULT_PROMPT_PREFIX;
  }

  try {
    const stored = localStorage.getItem(PROMPT_PREFIX_KEY);
    return stored || DEFAULT_PROMPT_PREFIX;
  } catch (error) {
    console.error("Failed to load prompt prefix from localStorage:", error);
    return DEFAULT_PROMPT_PREFIX;
  }
};

export const savePromptPrefix = (prefix: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(PROMPT_PREFIX_KEY, prefix);
  } catch (error) {
    console.error("Failed to save prompt prefix to localStorage:", error);
  }
};

