import React, { type FC } from "react";
import { FileTextIcon, Trash2Icon, Edit2Icon, CheckIcon, XIcon, CopyPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PromptSet } from "@/lib/localStorage-prompts-adapter";
import { loadPromptSets, deletePromptSet, savePromptSet } from "@/lib/localStorage-prompts-adapter";

type PromptListProps = {
  onSelectPromptSet?: (promptSet: PromptSet) => void;
  currentPromptSetId?: string | null;
  onClosePanelForEdit?: () => void;
  onReloadPromptSet?: (promptSetId: string) => void;
};

export const PromptList: FC<PromptListProps> = ({ 
  onSelectPromptSet,
  currentPromptSetId,
  onClosePanelForEdit,
  onReloadPromptSet,
}) => {
  const [promptSets, setPromptSets] = React.useState<PromptSet[]>([]);

  React.useEffect(() => {
    const refresh = () => {
      setPromptSets(loadPromptSets());
    };
    refresh();
    
    // Listen for prompt set saves
    window.addEventListener("prompt-set-saved", refresh);
    return () => {
      window.removeEventListener("prompt-set-saved", refresh);
    };
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Close the panel if the prompt set being deleted is the one currently open
    if (id === currentPromptSetId && onClosePanelForEdit) {
      onClosePanelForEdit();
    }
    deletePromptSet(id);
    setPromptSets(loadPromptSets());
  };

  const handleSelect = (promptSet: PromptSet) => {
    onSelectPromptSet?.(promptSet);
  };

  const handleUpdate = (updatedPromptSet: PromptSet) => {
    savePromptSet(updatedPromptSet);
    setPromptSets(loadPromptSets());
    // Reload the prompt set in the panel if it's the current one
    // Use a small delay to ensure the panel has closed first
    if (updatedPromptSet.id === currentPromptSetId && onReloadPromptSet) {
      setTimeout(() => {
        onReloadPromptSet(updatedPromptSet.id);
      }, 100);
    }
  };

  const handleDuplicate = (promptSet: PromptSet) => {
    const timestamp = Date.now();
    const duplicatedPromptSet: PromptSet = {
      ...promptSet,
      id: `prompt-set-${timestamp}`,
      title: `${promptSet.title} (Copy)`,
      createdAt: timestamp,
      updatedAt: timestamp,
      prompts: promptSet.prompts.map((prompt, index) => ({
        ...prompt,
        id: `${timestamp}-${index}`,
      })),
    };
    savePromptSet(duplicatedPromptSet);
    setPromptSets(loadPromptSets());
  };

  if (promptSets.length === 0) {
    return (
      <div className="flex flex-col items-stretch gap-1.5">
        <div className="px-3 py-2 text-sm text-muted-foreground">
          No saved prompt sets
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      {promptSets.map((promptSet) => (
        <PromptListItem
          key={promptSet.id}
          promptSet={promptSet}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onUpdate={handleUpdate}
          currentPromptSetId={currentPromptSetId}
          onClosePanelForEdit={onClosePanelForEdit}
        />
      ))}
    </div>
  );
};

const PromptListItem: FC<{
  promptSet: PromptSet;
  onSelect: (promptSet: PromptSet) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onDuplicate: (promptSet: PromptSet) => void;
  onUpdate: (promptSet: PromptSet) => void;
  currentPromptSetId?: string | null;
  onClosePanelForEdit?: () => void;
}> = ({ promptSet, onSelect, onDelete, onDuplicate, onUpdate, currentPromptSetId, onClosePanelForEdit }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState(promptSet.title || "Untitled");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Close the panel if this is the currently loaded prompt set
    if (promptSet.id === currentPromptSetId && onClosePanelForEdit) {
      onClosePanelForEdit();
    }
    setIsEditing(true);
    setEditedTitle(promptSet.title || "Untitled");
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(promptSet);
  };

  const handleSave = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const trimmedTitle = editedTitle.trim() || "Untitled";
    onUpdate({
      ...promptSet,
      title: trimmedTitle,
      updatedAt: Date.now(),
    });
    setIsEditing(false);
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditedTitle(promptSet.title || "Untitled");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave(e);
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="group/item relative flex items-center rounded-lg transition-all hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      {isEditing ? (
        <>
          <FileTextIcon className="ml-3 size-4 shrink-0" />
          <Input
            ref={inputRef}
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm pl-1.5 pr-16"
            placeholder="Enter title"
          />
          <div className="absolute right-0 flex items-center gap-0 pr-1">
            <Button
              onClick={handleSave}
              className="size-7 shrink-0 p-1"
              variant="ghost"
              size="icon"
              title="Save"
            >
              <CheckIcon className="size-4" />
            </Button>
            <Button
              onClick={handleCancel}
              className="size-7 shrink-0 p-1"
              variant="ghost"
              size="icon"
              title="Cancel"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <Button
            onClick={() => onSelect(promptSet)}
            className="grow justify-start px-2 py-1 text-left"
            variant="ghost"
          >
            <FileTextIcon className="mx-0 size-4 shrink-0" />
            <span className="flex-1 truncate text-sm">{promptSet.title || "Untitled"}</span>
          </Button>
          <div className="absolute right-0 flex items-center gap-0 pr-1 opacity-0 group-hover/item:opacity-80 transition-opacity pointer-events-none group-hover/item:pointer-events-auto bg-gray-100 dark:bg-gray-800 rounded">
            <Button
              onClick={handleEdit}
              className="size-7 shrink-0 p-1 opacity-100 pointer-events-auto"
              variant="ghost"
              size="icon"
              title="Edit title"
            >
              <Edit2Icon className="size-4" />
            </Button>
            <Button
              onClick={handleDuplicate}
              className="size-7 shrink-0 p-1 opacity-100 pointer-events-auto"
              variant="ghost"
              size="icon"
              title="Duplicate prompt set"
            >
              <CopyPlus className="size-4" />
            </Button>
            <Button
              onClick={(e) => onDelete(promptSet.id, e)}
              className="size-7 shrink-0 p-1 opacity-100 pointer-events-auto"
              variant="ghost"
              size="icon"
              title="Delete prompt set"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

