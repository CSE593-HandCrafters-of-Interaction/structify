import type { PromptItem } from "@/components/structify/prompt-panel";

const STORAGE_KEY = "structify-prompt-sets";
const CURRENT_PROMPTS_KEY = "structify-current-prompts";
const CURRENT_PANEL_TITLE_KEY = "structify-current-panel-title";

export type PromptSet = {
  id: string;
  title: string;
  prompts: PromptItem[];
  createdAt: number;
  updatedAt: number;
};

export const loadPromptSets = (): PromptSet[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load prompt sets from localStorage:", error);
    return [];
  }
};

export const savePromptSet = (promptSet: PromptSet): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const existing = loadPromptSets();
    const index = existing.findIndex((p) => p.id === promptSet.id);
    
    const updated = index >= 0
      ? existing.map((p) => (p.id === promptSet.id ? promptSet : p))
      : [...existing, promptSet];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save prompt set to localStorage:", error);
  }
};

export const deletePromptSet = (id: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const existing = loadPromptSets();
    const filtered = existing.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete prompt set from localStorage:", error);
  }
};

export const loadCurrentPrompts = (): { prompts: PromptItem[]; panelTitle: string } | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const promptsStored = localStorage.getItem(CURRENT_PROMPTS_KEY);
    const titleStored = localStorage.getItem(CURRENT_PANEL_TITLE_KEY);
    
    if (!promptsStored) {
      return null;
    }

    const prompts = JSON.parse(promptsStored) as PromptItem[];
    const panelTitle = titleStored || "Structured Prompts";
    
    return { prompts, panelTitle };
  } catch (error) {
    console.error("Failed to load current prompts from localStorage:", error);
    return null;
  }
};

export const saveCurrentPrompts = (prompts: PromptItem[], panelTitle: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(CURRENT_PROMPTS_KEY, JSON.stringify(prompts));
    localStorage.setItem(CURRENT_PANEL_TITLE_KEY, panelTitle);
  } catch (error) {
    console.error("Failed to save current prompts to localStorage:", error);
  }
};

