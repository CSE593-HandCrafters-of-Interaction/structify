import promptPrefixData from "@/data/prompt-prefix.json";
import finalInstructionData from "@/data/final-instruction.json";
import suggestInstructionData from "@/data/suggest-instruction.json";
import summarizeInstructionData from "@/data/summarize-instruction.json";

const PROMPT_PREFIX_KEY = "structify-prompt-prefix";
const FINAL_INSTRUCTION_KEY = "structify-final-instruction";
const SUGGEST_INSTRUCTION_KEY = "structify-suggest-instruction";
const SUMMARIZE_INSTRUCTION_KEY = "structify-summarize-instruction";

export const DEFAULT_PROMPT_PREFIX = promptPrefixData.lines.join("\n");

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

export const DEFAULT_FINAL_INSTRUCTION = finalInstructionData.lines.join("\n");

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

export const DEFAULT_SUGGEST_INSTRUCTION = suggestInstructionData.lines.join("\n");

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

export const DEFAULT_SUMMARIZE_INSTRUCTION = summarizeInstructionData.lines.join("\n");

export const loadSummarizeInstruction = (): string => {
  if (typeof window === "undefined") {
    return DEFAULT_SUMMARIZE_INSTRUCTION;
  }

  try {
    const stored = localStorage.getItem(SUMMARIZE_INSTRUCTION_KEY);
    return stored || DEFAULT_SUMMARIZE_INSTRUCTION;
  } catch (error) {
    console.error("Failed to load summarize instruction from localStorage:", error);
    return DEFAULT_SUMMARIZE_INSTRUCTION;
  }
};

export const saveSummarizeInstruction = (instruction: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(SUMMARIZE_INSTRUCTION_KEY, instruction);
  } catch (error) {
    console.error("Failed to save summarize instruction to localStorage:", error);
  }
};

