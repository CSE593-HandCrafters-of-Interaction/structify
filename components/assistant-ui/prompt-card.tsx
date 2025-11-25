"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { X, Pencil, Loader2, EyeOff, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface SummarySnapshot {
  previousTitle: string;
  previousContent: string[];
  summaryContent: string[];
}

interface PromptCardProps {
  id: string;
  title: string;
  content?: string[];
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, data: { title: string; content: string[] }) => void;
  isEditing?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
  isIncluded: boolean;
  onIncludeChange?: (isIncluded: boolean) => void;
  summarySnapshot?: SummarySnapshot | null;
  onSummarySnapshotChange?: (id: string, snapshot?: SummarySnapshot) => void;
}

export function PromptCard({
  id,
  title,
  content = [],
  onDelete,
  onUpdate,
  isEditing = false,
  onEditingChange,
  isIncluded,
  onIncludeChange,
  summarySnapshot,
  onSummarySnapshotChange
}: PromptCardProps) {
  const [editTitle, setEditTitle] = useState(title);
  const [editContent, setEditContent] = useState(content.join("\n"));
  const [isSummarizing, setIsSummarizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoSaveReadyRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setEditTitle(title);
      setEditContent(content.join("\n"));
    }
  }, [title, content, isEditing]);

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
    const sourceContent = isEditing ? normalizeContent(editContent) : content;
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

      onUpdate?.(id, { title: sourceTitle, content: summaryLines });
      setEditContent(summaryLines.join("\n"));
      onSummarySnapshotChange?.(id, {
        previousTitle: sourceTitle,
        previousContent: sourceContent,
        summaryContent: summaryLines
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
    setEditContent(previousContent.join("\n"));
    onSummarySnapshotChange?.(id);
  };

  const renderSummarizeButton = (className?: string) => {
    if (!isEditing || summarySnapshot) return null;
    const hasContent = isEditing ? normalizeContent(editContent).length > 0 : content.length > 0;
    return (
      <Button
        type="button"
        variant="secondary"
        onClick={(e) => {
          e.stopPropagation();
          handleSummarize();
        }}
        disabled={isSummarizing || !hasContent}
        className={cn(
          "h-auto rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-900 hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-yellow-900/30 dark:text-yellow-200 dark:hover:bg-yellow-900/50",
          className,
        )}
      >
        {isSummarizing ? <Loader2 className="size-4 animate-spin" /> : "Summarize"}
      </Button>
    );
  };

  const renderUndoButton = (className?: string) => {
    if (!isEditing || !summarySnapshot) return null;
    return (
      <Button
        type="button"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          handleUndoSummary();
        }}
        disabled={isSummarizing}
        className={cn(
          "h-auto rounded-full px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800",
          className,
        )}
      >
        Undo
      </Button>
    );
  };

  useEffect(() => {
    if (!summarySnapshot) return;
    if (
      arraysEqual(content, summarySnapshot.summaryContent) ||
      arraysEqual(content, summarySnapshot.previousContent)
    ) {
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

    const nextContent = editContent
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

    onUpdate?.(id, {
      title: editTitle,
      content: nextContent
    });
  }, [editTitle, editContent, id, isEditing, onUpdate]);

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

      {isEditing ? (
        <div className="space-y-2">
          <Input
            value={editTitle}
            placeholder="Untitled Prompt"
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-sm font-semibold"
          />
          <Textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={1}
            className="text-sm resize-none overflow-hidden min-h-0"
          />
          <div className="flex flex-wrap items-center gap-2">
            {renderSummarizeButton()}
            {renderUndoButton()}
            <Button
              type="button"
              onClick={handleDone}
              className="ml-auto h-auto rounded bg-yellow-400 px-3 py-1 text-sm text-yellow-950 hover:bg-yellow-500"
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div onClick={() => onEditingChange?.(true)} className="cursor-pointer">
            <h3 className="mb-2 pr-6 font-semibold line-clamp-2">{truncateText(title, 80)}</h3>
            {content.length > 0 && (
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {content.slice(0, 5).map((item, idx) => (
                  <li key={idx} className="line-clamp-1">• {truncateText(item, 60)}</li>
                ))}
                {content.length > 5 && (
                  <li className="text-xs italic opacity-60">...and {content.length - 5} more</li>
                )}
              </ul>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {renderSummarizeButton("px-3")}
              {renderUndoButton("px-3")}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEditingChange?.(true);
              }}
              className="size-8 rounded-full border border-yellow-400 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-200 dark:hover:bg-yellow-900"
            >
              <Pencil className="size-4 text-yellow-600" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

