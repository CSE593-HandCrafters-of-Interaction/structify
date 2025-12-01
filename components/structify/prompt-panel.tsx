"use client";

import { useState, useEffect, useCallback, useRef, ChangeEvent } from "react";
import { Plus, ArrowLeft, Loader2, Download, Upload, Save, MoreVertical } from "lucide-react";
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
import { loadCurrentPrompts, saveCurrentPrompts, savePromptSet, loadPromptSets } from "@/lib/localStorage-prompts-adapter";
import type { PromptSet } from "@/lib/localStorage-prompts-adapter";

interface PromptPanelProps {
  onWidthChange?: (width: number) => void;
  promptSetToLoad?: PromptSet | null;
  onPromptSetLoaded?: () => void;
}

export type PromptCardContent =
  | { type: "bullet"; items: string[] }
  | { type: "slider"; value: number; min: number; max: number; step?: number };

export interface PromptItem {
  id: string;
  title: string;
  content: PromptCardContent;
  isEditing?: boolean;
  isIncluded: boolean;
  summarySnapshot?: SummarySnapshot;
  suggestVersion?: number;
}

type PromptPanelExport = {
  version?: number;
  panelTitle?: string;
  prompts: {
    id?: string;
    title?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content?: any;
    isIncluded?: boolean;
  }[];
};

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
  const { onWidthChange, promptSetToLoad, onPromptSetLoaded } = props;
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
  
  // Load from localStorage or use initial prompts
  const [prompts, setPrompts] = useState<PromptItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = loadCurrentPrompts();
      if (saved && saved.prompts.length > 0) {
        return saved.prompts;
      }
    }
    return (initialPrompts as PromptItem[]);
  });
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [newlyAddedPromptId, setNewlyAddedPromptId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Load panel title from localStorage or use default
  const [panelTitle, setPanelTitle] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = loadCurrentPrompts();
      if (saved && saved.panelTitle) {
        return saved.panelTitle;
      }
    }
    return "Structured Prompts";
  });
  const panelTitleInputRef = useRef<HTMLInputElement | null>(null);
  
  // Track current prompt set ID from the loaded prompt set
  const [currentPromptSetId, setCurrentPromptSetId] = useState<string | null>(null);
  
  // Load prompt set when promptSetToLoad changes
  useEffect(() => {
    if (promptSetToLoad) {
      // Save current prompts before loading new ones
      if (prompts.length > 0 && currentPromptSetId) {
        const existingPromptSet = loadPromptSets().find(p => p.id === currentPromptSetId);
        const currentPromptSet: PromptSet = existingPromptSet
          ? {
              ...existingPromptSet,
              title: panelTitle || "Structured Prompts",
              prompts: prompts.map((p) => ({
                id: p.id,
                title: p.title,
                content: p.content,
                isIncluded: p.isIncluded,
                isEditing: false,
              })),
              updatedAt: Date.now(),
            }
          : {
              id: currentPromptSetId,
              title: panelTitle || "Structured Prompts",
              prompts: prompts.map((p) => ({
                id: p.id,
                title: p.title,
                content: p.content,
                isIncluded: p.isIncluded,
                isEditing: false,
              })),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
        savePromptSet(currentPromptSet);
        window.dispatchEvent(new CustomEvent("prompt-set-saved"));
      }
      
      // Load the new prompt set
      setPrompts(promptSetToLoad.prompts.map(p => ({
        ...p,
        isEditing: false,
        summarySnapshot: undefined,
      })));
      setPanelTitle(promptSetToLoad.title);
      setCurrentPromptSetId(promptSetToLoad.id);
      setIsOpen(true);
      onPromptSetLoaded?.();
    }
  }, [promptSetToLoad, onPromptSetLoaded, prompts, panelTitle, currentPromptSetId]);
  
  // Save to localStorage whenever prompts or panelTitle change
  useEffect(() => {
    if (typeof window !== "undefined") {
      saveCurrentPrompts(prompts, panelTitle);
    }
  }, [prompts, panelTitle]);

  const handleSavePromptSet = useCallback(() => {
    const existingPromptSet = currentPromptSetId 
      ? loadPromptSets().find(p => p.id === currentPromptSetId)
      : null;
    
    const promptSet: PromptSet = existingPromptSet
      ? {
          ...existingPromptSet,
          title: panelTitle || "Structured Prompts",
          prompts: prompts.map((p) => ({
            id: p.id,
            title: p.title,
            content: p.content,
            isIncluded: p.isIncluded,
            isEditing: false,
          })),
          updatedAt: Date.now(),
        }
      : {
          id: `prompt-set-${Date.now()}`,
          title: panelTitle || "Structured Prompts",
          prompts: prompts.map((p) => ({
            id: p.id,
            title: p.title,
            content: p.content,
            isIncluded: p.isIncluded,
            isEditing: false,
          })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
    savePromptSet(promptSet);
    setCurrentPromptSetId(promptSet.id);
    // Trigger a refresh of the prompt list by dispatching a custom event
    window.dispatchEvent(new CustomEvent("prompt-set-saved"));
  }, [prompts, panelTitle, currentPromptSetId]);

  const handleExportPrompts = useCallback(() => {
    const exportData: PromptPanelExport = {
      version: 1,
      panelTitle: panelTitle,
      prompts: prompts.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        isIncluded: p.isIncluded,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const sanitizedTitle = panelTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'structured-prompts';
    a.download = `${sanitizedTitle}.structify.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [prompts, panelTitle]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportPrompts = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = String(e.target?.result ?? "");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const json = JSON.parse(text) as PromptPanelExport | any;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawPrompts: any[] = Array.isArray(json)
            ? json
            : Array.isArray(json.prompts)
            ? json.prompts
            : [];

          if (!rawPrompts.length) {
            console.error("Imported file has no prompts");
            alert("Invalid structured prompts file (no prompts found).");
            return;
          }

          const timestamp = Date.now();
          // Restore panel title if present in the imported file
          if (json && typeof json === "object" && typeof json.panelTitle === "string" && json.panelTitle.length > 0) {
            setPanelTitle(json.panelTitle);
          }

          const normalized: PromptItem[] = rawPrompts.map((raw, index) => {
            const id =
              typeof raw.id === "string" && raw.id.length > 0
                ? raw.id
                : `${timestamp}-${index}`;
            const title =
              typeof raw.title === "string" ? raw.title : "";

            const c = raw.content;
            let content: PromptCardContent;

            if (c && typeof c === "object" && c.type === "slider") {
              const value = Number(c.value) || 0;
              const min = Number(c.min) || 0;
              const max = Number(c.max) || value || min;
              const step =
                typeof c.step === "number" && c.step > 0
                  ? c.step
                  : undefined;
              content = {
                type: "slider",
                value,
                min,
                max,
                ...(step !== undefined ? { step } : {}),
              };
            } else if (c && typeof c === "object" && c.type === "bullet") {
              const items = Array.isArray(c.items)
                ? c.items.map((x: unknown) => String(x))
                : [];
              content = { type: "bullet", items };
            } else if (Array.isArray(c)) {
              const items = c.map((x) => String(x));
              content = { type: "bullet", items };
            } else {
              content = { type: "bullet", items: [] };
            }

            const isIncluded =
              typeof raw.isIncluded === "boolean" ? raw.isIncluded : true;

            return {
              id,
              title,
              content,
              isIncluded,
              isEditing: false,
              summarySnapshot: undefined,
              suggestVersion: 0,
            };
          });

          setPrompts(normalized);
          setIsOpen(true);
        } catch (err) {
          console.error("Failed to import prompts:", err);
          alert("Failed to import structured prompts. Please check the file format.");
        } finally {
          event.target.value = "";
        }
      };

      reader.readAsText(file);
    },
    [setPrompts, setIsOpen, setPanelTitle],
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
    setNewlyAddedPromptId(newPrompt.id);
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

            // Set the first newly created item as the focus target
            if (newItems.length > 0) {
              setNewlyAddedPromptId(newItems[0].id);
            }
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
        message += "  - " + prompt.content.value + "\n";
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

      const newPromptId = `${detail.messageId}-${Date.now()}`;
      setPrompts(prevPrompts => [
        ...prevPrompts,
        {
          id: newPromptId,
          title: detail.title,
          content: { type: "bullet", items: detail.content },
          isEditing: false,
          isIncluded: true,
        },
      ]);
      setNewlyAddedPromptId(newPromptId);
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

  // Scroll to newly added prompt card
  useEffect(() => {
    if (!newlyAddedPromptId || !scrollContainerRef.current || !isOpen) return;

    // Use setTimeout to ensure DOM has updated and panel animation has completed
    const timeoutId = setTimeout(() => {
      const cardElement = scrollContainerRef.current?.querySelector(
        `[data-prompt-id="${newlyAddedPromptId}"]`
      ) as HTMLElement;

      if (cardElement && scrollContainerRef.current) {
        // Scroll the card into view with smooth behavior
        cardElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }

      // Reset the newly added prompt ID after scrolling
      setNewlyAddedPromptId(null);
    }, 200); // Increased timeout to allow panel animation to complete

    return () => clearTimeout(timeoutId);
  }, [newlyAddedPromptId, isOpen]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportPrompts}
      />
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
              <SidebarMenuItem className="flex-1 min-w-0">
                <SidebarMenuButton
                  asChild
                  size="lg"
                  className="w-full justify-start px-0 font-semibold"
                >
                  <input
                    ref={panelTitleInputRef}
                    type="text"
                    value={panelTitle}
                    onChange={(e) => setPanelTitle(e.target.value)}
                    className="rounded-md px-3 py-1 text-xl bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:bg-transparent cursor-text w-full"
                    style={{ font: 'inherit', color: 'inherit', appearance: 'none', WebkitAppearance: 'none' }}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem className="ml-auto">
                <div className="relative group/menu">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Menu"
                    className="h-8 w-8 rounded-full"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  <div className="absolute right-0 top-full pt-1 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-50 pointer-events-none group-hover/menu:pointer-events-auto">
                    <div className="bg-background border border-border rounded-md shadow-lg py-1 min-w-[160px]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSavePromptSet}
                      className="w-full justify-start gap-2 rounded-none h-9 px-3"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleExportPrompts}
                      className="w-full justify-start gap-2 rounded-none h-9 px-3"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Export</span>
                    </Button>
                    </div>
                  </div>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <div className="flex-1 overflow-y-auto -pr-3 -mr-3">
            <div ref={scrollContainerRef} className="space-y-4 mr-3">
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


