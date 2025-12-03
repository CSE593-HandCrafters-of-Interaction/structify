"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { loadPromptPrefix, savePromptPrefix, DEFAULT_PROMPT_PREFIX } from "@/lib/localStorage-settings-adapter";

type SettingsViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsView({ open, onOpenChange }: SettingsViewProps) {
  const [promptPrefix, setPromptPrefix] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setPromptPrefix(loadPromptPrefix());
    }
  }, [open]);

  const handlePromptPrefixChange = (value: string) => {
    setPromptPrefix(value);
    savePromptPrefix(value);
  };

  const handleResetPromptPrefix = () => {
    setPromptPrefix(DEFAULT_PROMPT_PREFIX);
    savePromptPrefix(DEFAULT_PROMPT_PREFIX);
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
          <div className="space-y-6">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

