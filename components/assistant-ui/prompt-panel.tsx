"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ArrowLeft, Loader2 } from "lucide-react";
import { PromptCard } from "./prompt-card";
import type { SummarySnapshot } from "./prompt-card";
import { useAssistantApi } from "@assistant-ui/react";
import { Button } from "../ui/button";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import {
  Panel,
  PanelTrigger,
  PanelExpandTrigger,
  PanelResizer,
} from "../ui/panel";
import { PROMPT_COLLECT_EVENT, type PromptCollectDetail } from "@/lib/prompt-collector";
import { useIsMobile } from "@/hooks/use-mobile";
import initialPrompts from "@/data/initial.json";

interface PromptPanelProps {
  onWidthChange?: (width: number) => void;
}

export type PromptCardContent =
  | { type: "bullet"; items: string[] }
  | { type: "slider"; value: number; unit?: string, min?: number; max?: number; step?: number };

interface PromptItem {
  id: string;
  title: string;
  content: PromptCardContent;
  isEditing?: boolean;
  isIncluded: boolean;
  summarySnapshot?: SummarySnapshot;
  suggestVersion?: number;
}

const PANEL_FLOATING = true;
const PANEL_DEFAULT_WIDTH = 320;
const PANEL_MIN_WIDTH = 260;
const PANEL_MAX_WIDTH_RATIO = 2 / 3;
const PANEL_MAX_WIDTH_FALLBACK = 500;

const getPanelMaxWidth = (isMobile: boolean) => {
  if (typeof window === "undefined") {
    return PANEL_MAX_WIDTH_FALLBACK;
  }

  const viewportWidth = window.innerWidth;
  return isMobile
    ? viewportWidth
    : Math.round(viewportWidth * PANEL_MAX_WIDTH_RATIO);
};

const clampPanelWidth = (value: number, maxWidth: number) =>
  Math.min(Math.max(value, PANEL_MIN_WIDTH), maxWidth);

export function PromptPanel(props: PromptPanelProps = {}) {
  const { onWidthChange } = props;
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [suggestingCardId, setSuggestingCardId] = useState<string | null>(null);
  const [panelMaxWidth, setPanelMaxWidth] = useState(() => getPanelMaxWidth(isMobile));
  const [panelWidth, setPanelWidth] = useState(() => {
    const maxWidth = getPanelMaxWidth(isMobile);
    return isMobile ? maxWidth : clampPanelWidth(PANEL_DEFAULT_WIDTH, maxWidth);
  });
  const api = useAssistantApi();
  const threadRuntime = api.thread();
  const [prompts, setPrompts] = useState<PromptItem[]>(() =>
    (initialPrompts as PromptItem[])
  );

  const addPrompt = () => {
    const newPrompt: PromptItem = {
      id: Date.now().toString(),
      title: "",
      content: { type: "bullet", items: [] },
      isEditing: false,
      isIncluded: true,
    };
    setPrompts([...prompts, newPrompt]);
  };

  const deletePrompt = (id: string) => {
    setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== id));
  };

  const updatePrompt = useCallback((id: string, data: { title: string; content: PromptCardContent }) => {
    setPrompts(prevPrompts => prevPrompts.map(p => {
      if (p.id === id) {
        return { ...p, title: data.title, content: data.content };
      }
      return p;
    }));
  }, []);

  const updateSummarySnapshot = useCallback((id: string, snapshot?: SummarySnapshot) => {
    setPrompts(prevPrompts =>
      prevPrompts.map(p => (
        p.id === id
          ? { ...p, summarySnapshot: snapshot === null ? undefined : snapshot }
          : p
      )),
    );
  }, []);

  type SuggestionPatch = {
    cardId: string | null;
    title?: string;
    content?: string[] | PromptCardContent;
    isIncluded?: boolean;
  };

  type SuggestResponse = {
    suggestions?: SuggestionPatch[];
  };

  const handleSuggestCard = useCallback(
    async (focusId: string) => {
      setSuggestingCardId(focusId);

      try {
        const response = await fetch("/api/suggest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cards: prompts.map((p) => ({
              id: p.id,
              title: p.title,
              content: p.content.type === "bullet" ? p.content.items : [],
              isIncluded: p.isIncluded,
            })),
            focusCardId: focusId,
          }),
        });

        if (!response.ok) {
          console.error("Suggest request failed with", response.status);
          return;
        }

        const data = (await response.json()) as SuggestResponse;
        const suggestions = Array.isArray(data.suggestions)
          ? data.suggestions
          : [];

        if (suggestions.length === 0) {
          console.log("[PromptPanel] suggest: no suggestions returned");
          return;
        }

        setPrompts((prevPrompts) => {
          const updates = suggestions.filter(
            (s): s is SuggestionPatch & { cardId: string } =>
              typeof s.cardId === "string" && !!s.cardId,
          );
          const creations = suggestions.filter(
            (s) => s.cardId === null,
          );

          let next = prevPrompts.map((p) => {
            const s = updates.find((u) => u.cardId === p.id);
            if (!s) return p;

            const content: PromptCardContent = s.content !== undefined
              ? (Array.isArray(s.content) ? { type: "bullet" as const, items: s.content } : s.content)
              : p.content;
            return {
              ...p,
              title:
                typeof s.title === "string" && s.title.length > 0
                  ? s.title
                  : p.title,
              content,
              isIncluded:
                typeof s.isIncluded === "boolean"
                  ? s.isIncluded
                  : p.isIncluded,
              suggestVersion: (p.suggestVersion ?? 0) + 1,
            };
          });

          if (creations.length > 0) {
            const focusIndex = next.findIndex((p) => p.id === focusId);
            const insertIndex =
              focusIndex >= 0 ? focusIndex + 1 : next.length;

            const timestamp = Date.now();

            const newItems: PromptItem[] = creations.map((c, index) => ({
              id: `${timestamp}-${index}`,
              title: c.title || "New Card",
              content: c.content !== undefined ? (Array.isArray(c.content) ? { type: "bullet", items: c.content } : c.content) : { type: "bullet", items: [] },
              isIncluded:
                typeof c.isIncluded === "boolean" ? c.isIncluded : true,
              isEditing: true,
              summarySnapshot: undefined,
              suggestVersion: 0,
            }));

            next = [
              ...next.slice(0, insertIndex),
              ...newItems,
              ...next.slice(insertIndex),
            ];
          }

          return next;
        });
      } catch (error) {
        console.error("Failed to suggest prompts:", error);
      } finally {
        setSuggestingCardId((current) =>
          current === focusId ? null : current,
        );
      }
    },
    [prompts],
  );

  const sendAllPrompts = async () => {
    setPrompts(prompts.map(p => ({ ...p, isEditing: false })));

    let message = `You will now receive a unified set of structured instructions.
They are organized into titled sections. Each section contains
bullet points that define requirements, constraints, or examples.

Interpret every section as part of one cohesive prompt.
Titles are for organization only — not separate tasks.

After reading all sections, follow the FINAL INSTRUCTION section.
Do not repeat or restate the instructions unless explicitly asked.

`;
    prompts.forEach((prompt) => {
      // Only include included prompts
      if (!prompt.isIncluded) {
        return;
      }
      message += "[" + (prompt.title || "") + "]\n";
      if (prompt.content.type === "bullet" && prompt.content.items.length > 0) {
        prompt.content.items.forEach(item => {
          message += "  - " + item + "\n";
        });
      } else if (prompt.content.type === "slider") {
        const sliderValue = prompt.content.value + (prompt.content.unit ? ` ${prompt.content.unit}` : "");
        message += "  - " + sliderValue + "\n";
      }
      message += "\n";
    });

    message += `[FINAL INSTRUCTION]
Generate your response and follow all instructions above.`;

    setIsSending(true);
    try {
      threadRuntime.composer.setText(message);
      await threadRuntime.composer.send();
    } finally {
      setIsSending(false);
      if (isMobile) {
        setIsOpen(false);
      }
    }
  };

  const updateEditingState = (id: string, isEditing: boolean) => {
    setPrompts(prevPrompts => prevPrompts.map(p => p.id === id ? { ...p, isEditing } : p));
  };

  const updateIncludeState = (id: string, isIncluded: boolean) => {
    setPrompts(prevPrompts => prevPrompts.map(p => p.id === id ? { ...p, isIncluded } : p));
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      const nextMaxWidth = getPanelMaxWidth(isMobile);
      setPanelMaxWidth(nextMaxWidth);
      setPanelWidth((prevWidth) =>
        isMobile ? nextMaxWidth : clampPanelWidth(prevWidth, nextMaxWidth),
      );
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobile]);

  useEffect(() => {
    const handleCollect = (event: Event) => {
      const detail = (event as CustomEvent<PromptCollectDetail>).detail;
      if (!detail || detail.content.length === 0) {
        return;
      }

      setPrompts(prevPrompts => [
        ...prevPrompts,
        {
          id: `${detail.messageId}-${Date.now()}`,
          title: detail.title,
          content: { type: "bullet", items: detail.content },
          isEditing: false,
          isIncluded: true,
        },
      ]);
      setIsOpen(true);
    };

    window.addEventListener(PROMPT_COLLECT_EVENT, handleCollect);
    return () => {
      window.removeEventListener(PROMPT_COLLECT_EVENT, handleCollect);
    };
  }, []);

  useEffect(() => {
    onWidthChange?.(isOpen ? panelWidth : 0);
  }, [isOpen, panelWidth, onWidthChange]);

  useEffect(() => {
    return () => {
      onWidthChange?.(0);
    };
  }, [onWidthChange]);

  return (
    <>
      <PanelExpandTrigger
        isOpen={isOpen}
        onOpen={() => setIsOpen(true)}
      />
      <Panel open={isOpen} floating={PANEL_FLOATING} width={panelWidth}>
        <PanelResizer
          open={isOpen}
          width={panelWidth}
          minWidth={PANEL_MIN_WIDTH}
          maxWidth={panelMaxWidth}
          onResize={(nextWidth) =>
            setPanelWidth(clampPanelWidth(nextWidth, panelMaxWidth))
          }
        />
        <div className="flex h-full flex-col px-4 pb-4 pt-2">
          <SidebarHeader className="flex items-center gap-2 px-0 pb-4">
            <SidebarMenu className="flex-row items-center gap-2">
              <SidebarMenuItem className="w-auto">
                <PanelTrigger
                  onClick={() => setIsOpen(false)}
                  srLabel="Close prompt panel"
                />
              </SidebarMenuItem>
              <SidebarMenuItem className="w-auto">
                <SidebarMenuButton
                  asChild
                  size="lg"
                  className="w-auto justify-start px-0 font-semibold"
                >
                  <span className="rounded-md px-3 py-1 text-xl">Structured Prompts</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <div className="flex-1 space-y-4 overflow-y-auto">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                id={prompt.id}
                title={prompt.title}
                content={prompt.content}
                isEditing={prompt.isEditing}
                onDelete={deletePrompt}
                onUpdate={updatePrompt}
                onEditingChange={(isEditing) => updateEditingState(prompt.id, isEditing)}
                isIncluded={prompt.isIncluded}
                onIncludeChange={(isIncluded) => updateIncludeState(prompt.id, isIncluded)}
                summarySnapshot={prompt.summarySnapshot}
                onSummarySnapshotChange={updateSummarySnapshot}
                onSuggest={handleSuggestCard}
                isSuggesting={suggestingCardId === prompt.id}
                suggestVersion={prompt.suggestVersion}
              />
            ))}
          </div>

          <Button
            onClick={addPrompt}
            variant="outline"
            className="mt-4 flex items-center justify-center rounded-lg border-2 border-dashed border-yellow-400 bg-yellow-50 p-3 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-200 dark:hover:bg-yellow-900/40"
          >
            <Plus className="size-6 text-yellow-600" />
          </Button>

          <Button
            onClick={sendAllPrompts}
            disabled={isSending || prompts.filter(p => p.isIncluded).length === 0}
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-yellow-500 p-3 text-white hover:bg-yellow-600 disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ArrowLeft className="size-5" />
            )}
            <span>{isSending ? "Sending…" : "Send all prompts"}</span>
          </Button>
        </div>
      </Panel>
    </>
  );
}

