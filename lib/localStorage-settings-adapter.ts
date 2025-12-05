const PROMPT_PREFIX_KEY = "structify-prompt-prefix";
const FINAL_INSTRUCTION_KEY = "structify-final-instruction";
const SUGGEST_INSTRUCTION_KEY = "structify-suggest-instruction";

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

export const DEFAULT_FINAL_INSTRUCTION = `Generate your response and follow all instructions above.`;

export const loadFinalInstruction = (): string => {
  if (typeof window === "undefined") {
    return DEFAULT_FINAL_INSTRUCTION;
  }

  try {
    const stored = localStorage.getItem(FINAL_INSTRUCTION_KEY);
    return stored || DEFAULT_FINAL_INSTRUCTION;
  } catch (error) {
    console.error("Failed to load final instruction from localStorage:", error);
    return DEFAULT_FINAL_INSTRUCTION;
  }
};

export const saveFinalInstruction = (instruction: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(FINAL_INSTRUCTION_KEY, instruction);
  } catch (error) {
    console.error("Failed to save final instruction to localStorage:", error);
  }
};

export const DEFAULT_SUGGEST_INSTRUCTION = [
  "You are helping a user design structured prompt cards for an LLM.",
  "Each card has a title and content. Content is one of two types:",
  '- BULLET: { "type": "bullet", "items": ["item 1", "item 2", ...] }',
  '- SLIDER: { "type": "slider", "value": 200, "min": 100, "max": 300, "step": 10 }',
  "",
  "The user clicked `Suggest` on one specific FOCUS card.",
  "",
  "Your job:",
  "- Improve the FOCUS card's content (make it clearer, more specific, more actionable).",
  "- Keep the FOCUS card's content type sensible:",
  "  * Use BULLET for lists of tones, restrictions, style guidelines, etc.",
  "  * Use SLIDER for numeric ranges such as length, number of items, score thresholds, etc.",
  "- Optionally adjust other existing cards ONLY if they obviously conflict or can be obviously improved.",
  "- Optionally propose up to 3 NEW cards for helpful dimensions such as:",
  "  Tone, Length, Restriction, Audience, Structure, Style, Examples, etc.",
  "",
  "VERY IMPORTANT OUTPUT FORMAT:",
  "- You MUST output a single valid JSON object with this shape:",
  '  { "suggestions": [',
  "      {",
  '        "cardId": "existing-card-id-or-null",',
  '        "title": "Optional new title",',
  '        "content": {',
  '          "type": "bullet",',
  '          "items": ["item 1", "item 2"]',
  "        },",
  '        "isIncluded": true',
  "      },",
  "      {",
  '        "cardId": "existing-card-id-or-null",',
  '        "title": "Optional new title",',
  '        "content": {',
  '          "type": "slider",',
  '          "value": 200,',
  '          "min": 100,',
  '          "max": 300,',
  '          "step": 10',
  "        },",
  '        "isIncluded": false',
  "      }",
  "    ]",
  "  }",
  "- For EXISTING cards: use their cardId string.",
  "- For NEW cards: set cardId to null and ALWAYS provide a title and a content object.",
  "- Omit fields you don't change (e.g., if you don't change title, you can skip it).",
  "- Do NOT wrap JSON in markdown code fences.",
  "- Do NOT add any explanations outside the JSON.",
  "",
  "Constraints:",
  "- At least ONE suggestion MUST be for the FOCUS card (rewrite its content).",
  "- You only modify other existing cards if they obviously conflict or can be obviously improved.",
  "- You may modify at most 5 existing cards.",
  "- You may create at most 3 new cards.",
  "- Keep the user's language consistent with the original.",
].join("\n");

export const loadSuggestInstruction = (): string => {
  if (typeof window === "undefined") {
    return DEFAULT_SUGGEST_INSTRUCTION;
  }

  try {
    const stored = localStorage.getItem(SUGGEST_INSTRUCTION_KEY);
    return stored || DEFAULT_SUGGEST_INSTRUCTION;
  } catch (error) {
    console.error("Failed to load suggest instruction from localStorage:", error);
    return DEFAULT_SUGGEST_INSTRUCTION;
  }
};

export const saveSuggestInstruction = (instruction: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(SUGGEST_INSTRUCTION_KEY, instruction);
  } catch (error) {
    console.error("Failed to save suggest instruction to localStorage:", error);
  }
};

