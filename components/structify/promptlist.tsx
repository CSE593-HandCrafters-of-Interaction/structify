import React, { type FC } from "react";
import { FileTextIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PromptSet } from "@/lib/localStorage-prompts-adapter";
import { loadPromptSets, deletePromptSet } from "@/lib/localStorage-prompts-adapter";

type PromptListProps = {
  onSelectPromptSet?: (promptSet: PromptSet) => void;
};

export const PromptList: FC<PromptListProps> = ({ onSelectPromptSet }) => {
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
    deletePromptSet(id);
    setPromptSets(loadPromptSets());
  };

  const handleSelect = (promptSet: PromptSet) => {
    onSelectPromptSet?.(promptSet);
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
        />
      ))}
    </div>
  );
};

const PromptListItem: FC<{
  promptSet: PromptSet;
  onSelect: (promptSet: PromptSet) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}> = ({ promptSet, onSelect, onDelete }) => {
  return (
    <div className="group flex items-center gap-2 rounded-lg transition-all hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <Button
        onClick={() => onSelect(promptSet)}
        className="flex-grow justify-start px-3 py-2 text-start"
        variant="ghost"
      >
        <FileTextIcon className="mr-2 size-4 shrink-0" />
        <span className="flex-1 truncate text-sm">{promptSet.title || "Untitled"}</span>
      </Button>
      <Button
        onClick={(e) => onDelete(promptSet.id, e)}
        className="mr-3 ml-auto size-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        variant="ghost"
        size="icon"
        title="Delete prompt set"
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
};

