"use client";

import { useState, useEffect, useCallback, useRef, ChangeEvent } from "react";
import { Plus, ArrowLeft, Loader2, Upload, Save, Check, ArrowUpDown, Download } from "lucide-react";
import { PromptCard } from "./prompt-card";
import type { SummarySnapshot } from "./prompt-card";
import { useAssistantApi } from "@assistant-ui/react";
import { Button } from "../ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
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
import { cn } from "@/lib/utils";
import type { PromptSet } from "@/lib/localStorage-prompts-adapter";
import { loadPromptPrefix } from "@/lib/localStorage-settings-adapter";
import initialPrompts from "@/data/initial.json";

interface PromptPanelProps {
  onWidthChange?: (width: number) => void;
  currentPromptSet: PromptSet | null;
  onUpdatePromptSet: (promptSet: PromptSet) => void;
  onAddPrompt: (promptSetId: string) => void;
  onDeletePrompt: (promptSetId: string, promptId: string) => void;
  onUpdatePrompt: (promptSetId: string, promptId: string, data: { title: string; content: PromptCardContent }) => void;
  onUpdateTitle: (promptSetId: string, title: string) => void;
  onUpdateIncludeState: (promptSetId: string, promptId: string, isIncluded: boolean) => void;
  onUpdateEditingState: (promptSetId: string, promptId: string, isEditing: boolean) => void;
  onReorderPrompts: (promptSetId: string, newOrder: string[]) => void;
  shouldOpenWelcome?: boolean;
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

export function PromptPanel(props: PromptPanelProps) {
  const { 
    onWidthChange, 
    currentPromptSet,
    onUpdatePromptSet,
    onAddPrompt,
    onDeletePrompt,
    onUpdatePrompt,
    onUpdateTitle,
    onUpdateIncludeState,
    onUpdateEditingState,
    onReorderPrompts,
    shouldOpenWelcome,
  } = props;
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [suggestingCardId, setSuggestingCardId] = useState<string | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedPromptId, setDraggedPromptId] = useState<string | null>(null);
  const [dragOverPromptId, setDragOverPromptId] = useState<string | null>(null);
  const [panelMaxWidth, setPanelMaxWidth] = useState(() => getPanelMaxWidth(isMobile));
  const [panelWidth, setPanelWidth] = useState(() => {
    const maxWidth = getPanelMaxWidth(isMobile);
    return isMobile ? maxWidth : clampPanelWidth(PANEL_DEFAULT_WIDTH, maxWidth);
  });
  const api = useAssistantApi();
  const threadRuntime = api.thread();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [newlyAddedPromptId, setNewlyAddedPromptId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelTitleInputRef = useRef<HTMLInputElement | null>(null);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  
  // Local UI state for summary snapshots (not persisted)
  const [summarySnapshots, setSummarySnapshots] = useState<Map<string, SummarySnapshot>>(new Map());

  // Derived state from props
  const prompts: PromptItem[] = currentPromptSet?.prompts.map(p => ({
    ...p,
    summarySnapshot: summarySnapshots.get(p.id),
  })) ?? [];
  const panelTitle = currentPromptSet?.title ?? "Structured Prompts";
  const currentPromptSetId = currentPromptSet?.id ?? null;

  // Open panel when a prompt set is loaded
  useEffect(() => {
    if (currentPromptSet) {
      setIsOpen(true);
      // Clear summary snapshots when switching prompt sets
      setSummarySnapshots(new Map());
    }
    // Don't auto-close when currentPromptSet becomes null - let user close manually
    // This allows showing the empty state view when panel is opened without a prompt set
  }, [currentPromptSet]);

  // Open panel when shouldOpenWelcome is true (to show welcome view)
  useEffect(() => {
    if (shouldOpenWelcome) {
      setIsOpen(true);
    }
  }, [shouldOpenWelcome]);

  const handleSavePromptSet = useCallback(() => {
    if (!currentPromptSet) return;
    
    onUpdatePromptSet({
      ...currentPromptSet,
      title: panelTitle || "Untitled",
      prompts: prompts.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        isIncluded: p.isIncluded,
        isEditing: false,
      })),
      updatedAt: Date.now(),
    });
  }, [currentPromptSet, prompts, panelTitle, onUpdatePromptSet]);

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
          const importedTitle = json && typeof json === "object" && typeof json.panelTitle === "string" && json.panelTitle.length > 0
            ? json.panelTitle
            : "Imported Structured Prompt";

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

          // Create a new prompt set from the imported data
          const importedPromptSet: PromptSet = {
            id: `prompt-set-${Date.now()}`,
            title: importedTitle,
            prompts: normalized,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          onUpdatePromptSet(importedPromptSet);
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
    [onUpdatePromptSet],
  );

  const handleCreateNew = () => {
    // Create a new empty prompt set
    const newPromptSet: PromptSet = {
      id: `prompt-set-${Date.now()}`,
      title: "New Prompt Set",
      prompts: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onUpdatePromptSet(newPromptSet);
  };

  const handleStartWithTemplate = () => {
    const timestamp = Date.now();
    // Load template prompts from initial.json
    const templatePrompts = (initialPrompts as PromptItem[]).map((prompt, index) => ({
      ...prompt,
      id: `${timestamp}-${index}`,
      isEditing: false,
    }));
    
    const newPromptSet: PromptSet = {
      id: `prompt-set-${timestamp}`,
      title: "Letter of Condolences",
      prompts: templatePrompts,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    onUpdatePromptSet(newPromptSet);
  };

  const addPrompt = () => {
    if (!currentPromptSet) {
      // Create a new prompt set if none exists
      const newPromptSet: PromptSet = {
        id: `prompt-set-${Date.now()}`,
        title: "Structured Prompts",
        prompts: [{
          id: Date.now().toString(),
          title: "",
          content: { type: "bullet", items: [] },
          isEditing: false,
          isIncluded: true,
        }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onUpdatePromptSet(newPromptSet);
      setNewlyAddedPromptId(newPromptSet.prompts[0].id);
      return;
    }
    onAddPrompt(currentPromptSet.id);
    // The newly added prompt ID will be set by the parent after the update
  };

  const deletePrompt = (id: string) => {
    if (!currentPromptSetId) return;
    onDeletePrompt(currentPromptSetId, id);
  };

  const updatePrompt = useCallback((id: string, data: { title: string; content: PromptCardContent }) => {
    if (!currentPromptSetId) return;
    onUpdatePrompt(currentPromptSetId, id, data);
  }, [currentPromptSetId, onUpdatePrompt]);

  const updateSummarySnapshot = useCallback((id: string, snapshot?: SummarySnapshot) => {
    setSummarySnapshots(prev => {
      const next = new Map(prev);
      if (snapshot === undefined || snapshot === null) {
        next.delete(id);
      } else {
        next.set(id, snapshot);
      }
      return next;
    });
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

        if (!currentPromptSet) return;

        const updates = suggestions.filter(
          (s): s is SuggestionPatch & { cardId: string } =>
            typeof s.cardId === "string" && !!s.cardId,
        );
        const creations = suggestions.filter(
          (s) => s.cardId === null,
        );

        let next = prompts.map((p) => {
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

        onUpdatePromptSet({
          ...currentPromptSet,
          prompts: next,
          updatedAt: Date.now(),
        });
      } catch (error) {
        console.error("Failed to suggest prompts:", error);
      } finally {
        setSuggestingCardId((current) =>
          current === focusId ? null : current,
        );
      }
    },
    [prompts, currentPromptSet, onUpdatePromptSet],
  );

  const sendAllPrompts = async () => {
    if (!currentPromptSet) return;

    const updatedPrompts = prompts.map(p => ({ ...p, isEditing: false }));
    
    // Auto-save the prompt set before sending
    onUpdatePromptSet({
      ...currentPromptSet,
      title: panelTitle || "Structured Prompts",
      prompts: updatedPrompts.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        isIncluded: p.isIncluded,
        isEditing: false,
      })),
      updatedAt: Date.now(),
    });

    let message = loadPromptPrefix();
    updatedPrompts.forEach((prompt) => {
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
        message += "  - " + prompt.content.value + " (min: " + prompt.content.min + ", max: " + prompt.content.max + ")\n";
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
    if (!currentPromptSetId) return;
    onUpdateEditingState(currentPromptSetId, id, isEditing);
    // Note: Auto-save is handled by the save effect in assistant.tsx when currentPromptSet changes
  };

  const updateIncludeState = (id: string, isIncluded: boolean) => {
    if (!currentPromptSetId) return;
    onUpdateIncludeState(currentPromptSetId, id, isIncluded);
  };

  const handleToggleReorderMode = () => {
    setIsReorderMode(prev => {
      const newMode = !prev;
      // When entering reorder mode, exit all editing states
      if (newMode && currentPromptSetId) {
        prompts.forEach(prompt => {
          if (prompt.isEditing) {
            onUpdateEditingState(currentPromptSetId, prompt.id, false);
          }
        });
      }
      return newMode;
    });
    setDraggedPromptId(null);
    setDragOverPromptId(null);
  };

  const handleDragStart = (e: React.DragEvent, promptId: string) => {
    if (!isReorderMode) return;
    setDraggedPromptId(promptId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", promptId);
  };

  const handleDragOver = (e: React.DragEvent, targetPromptId?: string) => {
    if (!isReorderMode || !draggedPromptId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (targetPromptId && targetPromptId !== draggedPromptId) {
      setDragOverPromptId(targetPromptId);
    }
  };

  const handleDragLeave = () => {
    setDragOverPromptId(null);
  };

  const handleDrop = (e: React.DragEvent, targetPromptId: string) => {
    if (!isReorderMode || !draggedPromptId || !currentPromptSetId) return;
    e.preventDefault();
    setDragOverPromptId(null);
    
    if (draggedPromptId === targetPromptId) {
      setDraggedPromptId(null);
      return;
    }

    const currentOrder = prompts.map(p => p.id);
    const draggedIndex = currentOrder.indexOf(draggedPromptId);
    const targetIndex = currentOrder.indexOf(targetPromptId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPromptId(null);
      return;
    }

    // Create new order array
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedPromptId);

    onReorderPrompts(currentPromptSetId, newOrder);
    setDraggedPromptId(null);
  };

  const handleDragEnd = () => {
    setDraggedPromptId(null);
    setDragOverPromptId(null);
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
      const newPrompt: PromptItem = {
        id: newPromptId,
        title: detail.title,
        content: { type: "bullet", items: detail.content },
        isEditing: false,
        isIncluded: true,
      };

      if (!currentPromptSet) {
        // Create a new prompt set if none exists
        const newPromptSet: PromptSet = {
          id: `prompt-set-${Date.now()}`,
          title: "Structured Prompts",
          prompts: [newPrompt],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        onUpdatePromptSet(newPromptSet);
      } else {
        // Add to existing prompt set
        onUpdatePromptSet({
          ...currentPromptSet,
          prompts: [...currentPromptSet.prompts, newPrompt],
          updatedAt: Date.now(),
        });
      }
      setNewlyAddedPromptId(newPromptId);
      setIsOpen(true);
    };

    window.addEventListener(PROMPT_COLLECT_EVENT, handleCollect);
    return () => {
      window.removeEventListener(PROMPT_COLLECT_EVENT, handleCollect);
    };
  }, [currentPromptSet, onUpdatePromptSet]);

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
        onOpen={() => {
          setIsOpen(true);
          // If there's no current prompt set, the empty state view will be shown
        }}
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
        <div className="flex h-full flex-col px-4 pb-4 pt-0">
          {currentPromptSet ? (
            <>
              <SidebarHeader className="flex items-center gap-2 px-0 pb-2">
                <SidebarMenu className="flex-row items-center gap-2">
                  <SidebarMenuItem className="w-auto">
                    <PanelTrigger
                      onClick={() => setIsOpen(false)}
                      srLabel="Close prompt panel"
                    />
                  </SidebarMenuItem>
                  <SidebarMenuItem className="flex-1 min-w-0">
                    <div className="relative w-full">
                      <SidebarMenuButton
                        asChild
                        size="lg"
                        className="w-full justify-start px-0 font-semibold"
                      >
                        <input
                          ref={panelTitleInputRef}
                          type="text"
                          value={panelTitle}
                          onChange={(e) => {
                            if (currentPromptSetId) {
                              onUpdateTitle(currentPromptSetId, e.target.value);
                            }
                          }}
                          onFocus={() => setIsTitleFocused(true)}
                          onBlur={() => setIsTitleFocused(false)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSavePromptSet();
                              panelTitleInputRef.current?.blur();
                            }
                          }}
                          className={cn(
                            "rounded-md px-3 py-1 text-xl bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:bg-transparent cursor-text w-full",
                            isTitleFocused && "pr-10"
                          )}
                          style={{ font: 'inherit', color: 'inherit', appearance: 'none', WebkitAppearance: 'none' }}
                        />
                      </SidebarMenuButton>
                      {isTitleFocused && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSavePromptSet();
                            setTimeout(() => {
                              panelTitleInputRef.current?.blur();
                            }, 100);
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          title="Save title"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </SidebarMenuItem>

                  <SidebarMenuItem className="ml-auto flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleExportPrompts}
                          className="h-7 w-7"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Export
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarHeader>
              <div className="flex-1 overflow-y-auto -pr-3 -mr-3">
                <div 
                  ref={scrollContainerRef} 
                  className="space-y-4 mr-3"
                >
                  {prompts.map((prompt) => (
                    <PromptCard
                      key={prompt.id}
                      id={prompt.id}
                      title={prompt.title}
                      content={prompt.content}
                      isEditing={isReorderMode ? false : prompt.isEditing}
                      onDelete={deletePrompt}
                      onUpdate={updatePrompt}
                      onEditingChange={(isEditing) => {
                        if (!isReorderMode) {
                          updateEditingState(prompt.id, isEditing);
                        }
                      }}
                      isIncluded={prompt.isIncluded}
                      onIncludeChange={(isIncluded) => {
                        if (!isReorderMode) {
                          updateIncludeState(prompt.id, isIncluded);
                        }
                      }}
                      summarySnapshot={prompt.summarySnapshot}
                      onSummarySnapshotChange={updateSummarySnapshot}
                      onSuggest={handleSuggestCard}
                      isSuggesting={suggestingCardId === prompt.id}
                      suggestVersion={prompt.suggestVersion}
                      isReorderMode={isReorderMode}
                      isDragged={draggedPromptId === prompt.id}
                      isDragOver={dragOverPromptId === prompt.id}
                      onDragStart={(e) => handleDragStart(e, prompt.id)}
                      onDragOver={(e) => handleDragOver(e, prompt.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, prompt.id)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  onClick={addPrompt}
                  variant="outline"
                  disabled={isReorderMode}
                  className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-yellow-400 bg-yellow-50 p-3 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-200 dark:hover:bg-yellow-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="size-6 text-yellow-600" />
                </Button>
                <Button
                  onClick={handleToggleReorderMode}
                  variant={isReorderMode ? "default" : "outline"}
                  className={cn(
                    "flex items-center justify-center rounded-lg border-2 border-yellow-400 p-3",
                    isReorderMode
                      ? "bg-yellow-400 text-yellow-950 hover:bg-yellow-500"
                      : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-200 dark:hover:bg-yellow-900/40"
                  )}
                >
                  <ArrowUpDown className={cn("size-6", isReorderMode ? "text-yellow-950" : "text-yellow-600")} />
                </Button>
              </div>

              <Button
                onClick={sendAllPrompts}
                disabled={isSending || isReorderMode || prompts.filter(p => p.isIncluded).length === 0}
                className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-yellow-500 p-3 text-white hover:bg-yellow-600 disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <ArrowLeft className="size-5" />
                )}
                <span>{isSending ? "Sending…" : "Send all prompts"}</span>
              </Button>
            </>
          ) : (
            <>
              <SidebarHeader className="flex items-center gap-2 px-0 pb-2">
                <SidebarMenu className="flex-row items-center gap-2">
                  <SidebarMenuItem className="w-auto">
                    <PanelTrigger
                      onClick={() => setIsOpen(false)}
                      srLabel="Close prompt panel"
                    />
                  </SidebarMenuItem>
                  <SidebarMenuItem className="flex-1 min-w-0">
                    <SidebarMenuButton
                      size="lg"
                      className="w-full justify-start px-0 font-semibold"
                    >
                      Get Started
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarHeader>
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">No prompt set selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a new prompt set or start with a template
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <Button
                    onClick={handleCreateNew}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-yellow-500 p-4 text-white hover:bg-yellow-600"
                  >
                    <Plus className="size-5" />
                    <span>Create New Prompt Set</span>
                  </Button>
                  <Button
                    onClick={handleStartWithTemplate}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 rounded-lg border-2 p-4"
                  >
                    <span>Start with Example</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Panel>
    </>
  );
}


