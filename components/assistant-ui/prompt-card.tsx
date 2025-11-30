"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { X, Pencil, Loader2, EyeOff, Eye, Undo2, Maximize2, Minimize2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { PromptCardContent } from "./prompt-panel";

export interface SummarySnapshot {
  previousTitle: string;
  previousContent: PromptCardContent;
  summaryContent: PromptCardContent;
}

interface PromptCardProps {
  id: string;
  title: string;
  content?: PromptCardContent;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, data: { title: string; content: PromptCardContent }) => void;
  isEditing?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
  isIncluded: boolean;
  onIncludeChange?: (isIncluded: boolean) => void;
  onSuggest?: (id: string) => void;
  isSuggesting?: boolean;
  suggestVersion?: number;
  summarySnapshot?: SummarySnapshot | null;
  onSummarySnapshotChange?: (id: string, snapshot?: SummarySnapshot) => void;
}

export function PromptCard({
  id,
  title,
  content,
  onDelete,
  onUpdate,
  isEditing = false,
  onEditingChange,
  isIncluded,
  onIncludeChange,
  onSuggest,
  isSuggesting = false,
  suggestVersion,
  summarySnapshot,
  onSummarySnapshotChange
}: PromptCardProps) {
  const [editTitle, setEditTitle] = useState(title);
  const [editContent, setEditContent] = useState(
    content?.type === "bullet" ? content.items.join("\n") : content?.type === "slider" ? content.value.toString() : ""
  );
  const [editSliderValue, setEditSliderValue] = useState(
    content?.type === "slider" ? content.value : 0
  );
  const [isSummarizing, setIsSummarizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoSaveReadyRef = useRef(false);

  useEffect(() => {
    if (suggestVersion == null) return;
    setEditTitle(title);
    if (content?.type === "bullet") {
      setEditContent(content.items.join("\n"));
    } else if (content?.type === "slider") {
      setEditContent(content.value.toString());
      setEditSliderValue(content.value);
    }
  }, [suggestVersion, title, content]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    textarea.style.overflowY = "hidden";
  }, [editContent, isEditing]);

  const normalizeContent = (text: string) =>
    text
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

  const arraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value, index) => value === b[index]);

  const handleSummarize = async () => {
    if (!content || content.type !== "bullet") return;
    const sourceContent = isEditing ? normalizeContent(editContent) : content.items;
    if (sourceContent.length === 0 || isSummarizing) return;
    const sourceTitle = isEditing ? editTitle : title;

    setIsSummarizing(true);
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: isEditing ? editTitle : title,
          content: sourceContent
        })
      });

      if (!response.ok) {
        throw new Error(`Summarize request failed with ${response.status}`);
      }

      const { summary } = await response.json() as { summary?: string };
      if (!summary) return;

      const summaryLines = normalizeContent(summary);
      if (summaryLines.length === 0) return;

      const newContent: PromptCardContent = { type: "bullet", items: summaryLines };
      onUpdate?.(id, { title: sourceTitle, content: newContent });
      setEditContent(summaryLines.join("\n"));
      onSummarySnapshotChange?.(id, {
        previousTitle: sourceTitle,
        previousContent: content,
        summaryContent: newContent
      });
    } catch (error) {
      console.error("Failed to summarize prompt card:", error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleUndoSummary = () => {
    if (!summarySnapshot) return;

    const { previousTitle, previousContent } = summarySnapshot;
    onUpdate?.(id, { title: previousTitle, content: previousContent });
    setEditTitle(previousTitle);
    if (previousContent.type === "bullet") {
      setEditContent(previousContent.items.join("\n"));
    } else if (previousContent.type === "slider") {
      setEditContent(previousContent.value.toString());
      setEditSliderValue(previousContent.value);
    }
    onSummarySnapshotChange?.(id);
  };

  const renderSummarizeUndoButton = (className?: string) => {
    if (!isEditing) return null;
    if (!content || content.type !== "bullet") return null;
    const hasContent = isEditing ? normalizeContent(editContent).length > 0 : content.items.length > 0;
    const hasSnapshot = !!summarySnapshot;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={hasSnapshot ? "outline" : "secondary"}
            onClick={(e) => {
              e.stopPropagation();
              if (hasSnapshot) {
                handleUndoSummary();
              } else {
                handleSummarize();
              }
            }}
            disabled={isSummarizing || (!hasSnapshot && !hasContent)}
            className={cn(
              hasSnapshot
                ? "h-auto rounded-full px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                : "h-auto rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-900 hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-yellow-900/30 dark:text-yellow-200 dark:hover:bg-yellow-900/50",
              className,
            )}
          >
            {isSummarizing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              hasSnapshot ? <Undo2 className="size-4" /> : <Minimize2 className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {hasSnapshot ? "Undo Summarize" : "Summarize"}
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderSuggestButton = (className?: string) => {
    if (!isEditing) return null;
    if (!onSuggest) return null;

    const hasLoading = isSuggesting;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              if (hasLoading) return;
              onSuggest(id);
            }}
            disabled={hasLoading}
            className={cn(
              "h-auto rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-900 hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-yellow-900/30 dark:text-yellow-200 dark:hover:bg-yellow-900/50",
              className,
            )}
          >
            {hasLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Suggest
        </TooltipContent>
      </Tooltip>
    );
  };

  useEffect(() => {
    if (!summarySnapshot || !content) return;
    const contentEqual = content.type === summarySnapshot.summaryContent.type &&
      (content.type === "bullet" && summarySnapshot.summaryContent.type === "bullet"
        ? arraysEqual(content.items, summarySnapshot.summaryContent.items)
        : content.type === "slider" && summarySnapshot.summaryContent.type === "slider"
        ? content.value === summarySnapshot.summaryContent.value
        : false);
    const previousEqual = content.type === summarySnapshot.previousContent.type &&
      (content.type === "bullet" && summarySnapshot.previousContent.type === "bullet"
        ? arraysEqual(content.items, summarySnapshot.previousContent.items)
        : content.type === "slider" && summarySnapshot.previousContent.type === "slider"
        ? content.value === summarySnapshot.previousContent.value
        : false);
    if (contentEqual || previousEqual) {
      return;
    }
    onSummarySnapshotChange?.(id);
  }, [content, id, onSummarySnapshotChange, summarySnapshot]);

  useEffect(() => {
    if (!isEditing) {
      autoSaveReadyRef.current = false;
      return;
    }

    if (!autoSaveReadyRef.current) {
      autoSaveReadyRef.current = true;
      return;
    }

    if (content?.type === "bullet") {
      const nextContent: PromptCardContent = {
        type: "bullet",
        items: editContent
          .split("\n")
          .map((line: string) => line.trim())
          .filter(Boolean)
      };
      onUpdate?.(id, {
        title: editTitle,
        content: nextContent
      });
    } else if (content?.type === "slider") {
      const numValue = parseFloat(editContent) || editSliderValue;
      const nextContent: PromptCardContent = {
        type: "slider",
        value: numValue,
        min: content.min,
        max: content.max,
        step: content.step,
        unit: content.unit
      };
      onUpdate?.(id, {
        title: editTitle,
        content: nextContent
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTitle, editContent, editSliderValue, id, isEditing, onUpdate]);

  const handleDone = () => {
    onEditingChange?.(false);
  };

  const handleToggleIncluded = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onIncludeChange?.(!isIncluded);
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete?.(id);
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    const start = text.slice(0, 60);
    const end = text.slice(-20);
    return `${start}...${end}`;
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 p-4 transition-colors",
        isIncluded
          ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-600"
          : "border-yellow-400 border-dashed bg-yellow-50/40 text-gray-500 dark:border-yellow-600/80 dark:bg-yellow-950/10 dark:text-gray-400",
      )}
    >
      {!isEditing && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleToggleIncluded}
            title={isIncluded ? "Exclude this card from the send" : "Include this card in the send"}
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-yellow-400 px-2 py-1 text-xs font-semibold text-yellow-900 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-200 dark:hover:bg-yellow-900",
              isIncluded ? "bg-yellow-50" : "bg-white dark:bg-gray-800",
            )}
          >
            {isIncluded ? (
              <>
                <Eye className="size-3.5" />
                <span>Included</span>
              </>
            ) : (
              <>
                <EyeOff className="size-3.5" />
                <span>Excluded</span>
              </>
            )}
          </Button>
          {!isIncluded && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="size-7 rounded-full hover:bg-gray-200 dark:bg-background dark:hover:bg-gray-700"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      )}

      <div className={isEditing ? "space-y-2" : "relative"}>
        <div onClick={!isEditing ? () => onEditingChange?.(true) : undefined} className={!isEditing ? "cursor-pointer" : undefined}>
          {isEditing ? (
            <Input
              value={editTitle}
              placeholder="Untitled"
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-sm font-semibold"
            />
          ) : (
            <h3 className="mb-2 pr-6 font-semibold line-clamp-2">{truncateText(title, 80)}</h3>
          )}

          {content?.type === "slider" ? (
            <div 
              className="space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 flex flex-col">
                  <Slider
                    value={isEditing ? [editSliderValue] : [content.value]}
                    min={content.min ?? 0}
                    max={content.max ?? 100}
                    step={content.step ?? 1}
                    onValueChange={(values) => {
                      const newValue = values[0];
                      if (isEditing) {
                        setEditSliderValue(newValue);
                        setEditContent(newValue.toString());
                      } else {
                        const updatedContent: PromptCardContent = {
                          type: "slider",
                          value: newValue,
                          min: content.min,
                          max: content.max,
                          step: content.step,
                          unit: content.unit
                        };
                        onUpdate?.(id, { title, content: updatedContent });
                      }
                    }}
                    className={cn(
                      "**:data-[slot=slider-track]:bg-gray-200",
                      "**:data-[slot=slider-track]:dark:bg-gray-700",
                      "**:data-[slot=slider-range]:bg-yellow-400",
                      "**:data-[slot=slider-range]:dark:bg-yellow-600",
                      "**:data-[slot=slider-thumb]:border-yellow-400",
                      "**:data-[slot=slider-thumb]:dark:border-yellow-600"
                    )}
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{content.min ?? 0}</span>
                    <span>{content.max ?? 100}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 min-w-[80px]">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editContent}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value) || 0;
                        const clampedValue = Math.max(
                          content.min ?? 0,
                          Math.min(content.max ?? 100, newValue)
                        );
                        setEditContent(clampedValue.toString());
                        setEditSliderValue(clampedValue);
                      }}
                      min={content.min ?? 0}
                      max={content.max ?? 100}
                      step={content.step ?? 1}
                      className="w-20 text-sm"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {content.value}
                    </span>
                  )}
                  {content.unit && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">{content.unit}</span>
                  )}
                </div>
              </div>
              {isEditing && content.step !== undefined && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <span>Step: {content.step}</span>
                </div>
              )}
            </div>
          ) : content?.type === "bullet" ? (
            isEditing ? (
              <Textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={1}
                className="text-sm resize-none overflow-hidden min-h-0"
              />
            ) : content.items.length > 0 ? (
              content.items.length === 1 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {content.items[0]}
                </p>
              ) : (
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {content.items.slice(0, 5).map((item, idx) => (
                    <li key={idx} className="line-clamp-1">• {truncateText(item, 60)}</li>
                  ))}
                  {content.items.length > 5 && (
                    <li className="text-xs italic opacity-60">...and {content.items.length - 5} more</li>
                  )}
                </ul>
              )
            ) : null
          ) : null}
        </div>

        <div className={cn(
          "flex items-center gap-2",
          isEditing ? "flex-wrap" : "mt-3 justify-between"
        )}>
          {isEditing ? (
            <>
              {renderSummarizeUndoButton()}
              {renderSuggestButton()}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={handleDone}
                    className="ml-auto h-auto rounded-full bg-yellow-400 px-3 py-1 text-sm text-yellow-950 hover:bg-yellow-500"
                  >
                    <Check className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Done
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {renderSummarizeUndoButton("px-3")}
                {renderSuggestButton("px-3")}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditingChange?.(true);
                }}
                className="size-8 rounded-full border border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-200 dark:hover:bg-yellow-900"
              >
                <Pencil className="size-4 text-yellow-600" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

