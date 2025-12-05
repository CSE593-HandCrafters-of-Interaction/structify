"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { loadPromptPrefix, savePromptPrefix, DEFAULT_PROMPT_PREFIX, loadFinalInstruction, saveFinalInstruction, DEFAULT_FINAL_INSTRUCTION, loadSuggestInstruction, saveSuggestInstruction, DEFAULT_SUGGEST_INSTRUCTION, loadSummarizeInstruction, saveSummarizeInstruction, DEFAULT_SUMMARIZE_INSTRUCTION } from "@/lib/localStorage-settings-adapter";

type SettingsViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsView({ open, onOpenChange }: SettingsViewProps) {
  const [promptPrefix, setPromptPrefix] = React.useState("");
  const [finalInstruction, setFinalInstruction] = React.useState("");
  const [suggestInstruction, setSuggestInstruction] = React.useState("");
  const [summarizeInstruction, setSummarizeInstruction] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setPromptPrefix(loadPromptPrefix());
      setFinalInstruction(loadFinalInstruction());
      setSuggestInstruction(loadSuggestInstruction());
      setSummarizeInstruction(loadSummarizeInstruction());
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  const handlePromptPrefixChange = (value: string) => {
    setPromptPrefix(value);
    savePromptPrefix(value);
  };

  const handleResetPromptPrefix = () => {
    setPromptPrefix(DEFAULT_PROMPT_PREFIX);
    savePromptPrefix(DEFAULT_PROMPT_PREFIX);
  };

  const handleFinalInstructionChange = (value: string) => {
    setFinalInstruction(value);
    saveFinalInstruction(value);
  };

  const handleResetFinalInstruction = () => {
    setFinalInstruction(DEFAULT_FINAL_INSTRUCTION);
    saveFinalInstruction(DEFAULT_FINAL_INSTRUCTION);
  };

  const handleSuggestInstructionChange = (value: string) => {
    setSuggestInstruction(value);
    saveSuggestInstruction(value);
  };

  const handleResetSuggestInstruction = () => {
    setSuggestInstruction(DEFAULT_SUGGEST_INSTRUCTION);
    saveSuggestInstruction(DEFAULT_SUGGEST_INSTRUCTION);
  };

  const handleSummarizeInstructionChange = (value: string) => {
    setSummarizeInstruction(value);
    saveSummarizeInstruction(value);
  };

  const handleResetSummarizeInstruction = () => {
    setSummarizeInstruction(DEFAULT_SUMMARIZE_INSTRUCTION);
    saveSummarizeInstruction(DEFAULT_SUMMARIZE_INSTRUCTION);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-[95vw] w-full max-h-[90vh] sm:max-h-[90vh] h-full overflow-y-auto"
        showCloseButton={false}
      >
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md"
              onClick={() => onOpenChange(false)}
              title="Close settings"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
            <DialogTitle className="text-2xl font-semibold">Settings</DialogTitle>
          </div>
          <Tabs defaultValue="prompts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
            </TabsList>
            <TabsContent value="prompts" className="space-y-6 mt-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="prompt-prefix" className="text-sm font-medium">
                    Prompt Prefix
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetPromptPrefix}
                    className="gap-2"
                  >
                    <RotateCcw className="size-3" />
                    Reset
                  </Button>
                </div>
                <Textarea
                  id="prompt-prefix"
                  value={promptPrefix}
                  onChange={(e) => handlePromptPrefixChange(e.target.value)}
                  placeholder="Enter the prefix text that will be added before structured prompts..."
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This text will be prepended to all structured prompts when sending them to the assistant.
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="final-instruction" className="text-sm font-medium">
                    Final Instruction
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFinalInstruction}
                    className="gap-2"
                  >
                    <RotateCcw className="size-3" />
                    Reset
                  </Button>
                </div>
                <Textarea
                  id="final-instruction"
                  value={finalInstruction}
                  onChange={(e) => handleFinalInstructionChange(e.target.value)}
                  placeholder="Enter the final instruction text..."
                  className="min-h-[100px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This text will be appended after all structured prompts with the &quot;[FINAL INSTRUCTION]&quot; header.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="instructions" className="space-y-6 mt-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="summarize-instruction" className="text-sm font-medium">
                    Summarize Instruction
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetSummarizeInstruction}
                    className="gap-2"
                  >
                    <RotateCcw className="size-3" />
                    Reset
                  </Button>
                </div>
                <Textarea
                  id="summarize-instruction"
                  value={summarizeInstruction}
                  onChange={(e) => handleSummarizeInstructionChange(e.target.value)}
                  placeholder="Enter the instruction text for the summarize feature..."
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This instruction is sent to the AI when summarizing prompt cards.
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="suggest-instruction" className="text-sm font-medium">
                    Suggest Instruction
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetSuggestInstruction}
                    className="gap-2"
                  >
                    <RotateCcw className="size-3" />
                    Reset
                  </Button>
                </div>
                <Textarea
                  id="suggest-instruction"
                  value={suggestInstruction}
                  onChange={(e) => handleSuggestInstructionChange(e.target.value)}
                  placeholder="Enter the instruction text for the suggest feature..."
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This instruction is sent to the AI when generating suggestions for prompt cards.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

