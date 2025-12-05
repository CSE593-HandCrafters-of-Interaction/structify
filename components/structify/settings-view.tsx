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
import { loadPromptPrefix, savePromptPrefix, DEFAULT_PROMPT_PREFIX, loadFinalInstruction, saveFinalInstruction, DEFAULT_FINAL_INSTRUCTION, loadSuggestInstruction, saveSuggestInstruction, DEFAULT_SUGGEST_INSTRUCTION, loadSummarizeInstruction, saveSummarizeInstruction, DEFAULT_SUMMARIZE_INSTRUCTION, loadApiKeys, saveApiKey, loadTaskModels, saveTaskModel, hasApiKey, type ModelProvider, type TaskModel, DEFAULT_TASK_MODELS } from "@/lib/localStorage-settings-adapter";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle } from "lucide-react";

type SettingsViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsView({ open, onOpenChange }: SettingsViewProps) {
  const [promptPrefix, setPromptPrefix] = React.useState("");
  const [finalInstruction, setFinalInstruction] = React.useState("");
  const [suggestInstruction, setSuggestInstruction] = React.useState("");
  const [summarizeInstruction, setSummarizeInstruction] = React.useState("");
  const [apiKeys, setApiKeys] = React.useState<Record<ModelProvider, string>>({
    google: "",
    openai: "",
    anthropic: "",
  });
  const [taskModels, setTaskModels] = React.useState<Record<TaskModel, { provider: ModelProvider; modelId: string }>>(DEFAULT_TASK_MODELS);
  const [selectedProvider, setSelectedProvider] = React.useState<ModelProvider>("google");

  React.useEffect(() => {
    if (open) {
      setPromptPrefix(loadPromptPrefix());
      setFinalInstruction(loadFinalInstruction());
      setSuggestInstruction(loadSuggestInstruction());
      setSummarizeInstruction(loadSummarizeInstruction());
      setApiKeys(loadApiKeys());
      setTaskModels(loadTaskModels());
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

  const handleApiKeyChange = (provider: ModelProvider, apiKey: string) => {
    const updated = { ...apiKeys, [provider]: apiKey };
    setApiKeys(updated);
    saveApiKey(provider, apiKey);
  };

  const handleTaskModelChange = (task: TaskModel, provider: ModelProvider, modelId: string) => {
    const updated = { ...taskModels, [task]: { provider, modelId } };
    setTaskModels(updated);
    saveTaskModel(task, provider, modelId);
  };

  const getModelOptions = (provider: ModelProvider): string[] => {
    switch (provider) {
      case "google":
        return [
          "gemini-2.5-pro",
          "gemini-2.0-flash-exp",
          "models/gemini-flash-latest",
          "models/gemini-pro-latest",
          "models/gemini-1.5-pro-latest",
        ];
      case "openai":
        return [
          "gpt-4o",
          "gpt-4o-mini",
          "gpt-4-turbo",
          "gpt-3.5-turbo",
        ];
      case "anthropic":
        return [
          "claude-3-5-sonnet-20241022",
          "claude-3-opus-20240229",
          "claude-3-sonnet-20240229",
          "claude-3-haiku-20240307",
        ];
      default:
        return [];
    }
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="models">Models</TabsTrigger>
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
            <TabsContent value="models" className="space-y-6 mt-6">
              {/* API Key Management */}
              <div>
                <label htmlFor="model-provider" className="text-sm font-medium mb-2 block">
                  Model Provider & API Key
                </label>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="provider-select" className="text-xs text-muted-foreground mb-1 block">
                      Select Provider
                    </label>
                    <select
                      id="provider-select"
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value as ModelProvider)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <option value="google">Google (Gemini)</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="api-key-input" className="text-xs text-muted-foreground mb-1 block">
                      API Key
                    </label>
                    <Input
                      id="api-key-input"
                      type="password"
                      value={apiKeys[selectedProvider]}
                      onChange={(e) => handleApiKeyChange(selectedProvider, e.target.value)}
                      placeholder={`Enter ${selectedProvider} API key...`}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Your API key is stored locally in your browser.
                    </p>
                  </div>
                </div>
              </div>

              {/* Task Model Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Task Model Selection
                </label>
                <p className="text-xs text-muted-foreground mb-4">
                  Select models for each task. The selected model must have an API key configured above.
                </p>
                <div className="space-y-4">
                  {(["chat", "summarize", "suggest"] as TaskModel[]).map((task) => {
                    const taskModel = taskModels[task];
                    const hasKey = hasApiKey(taskModel.provider);
                    return (
                      <div key={task} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium capitalize">
                            {task} Model
                          </label>
                          {hasKey ? (
                            <CheckCircle2 className="size-4 text-green-500" />
                          ) : (
                            <XCircle className="size-4 text-red-500" />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={taskModel.provider}
                            onChange={(e) => {
                              const newProvider = e.target.value as ModelProvider;
                              const modelOptions = getModelOptions(newProvider);
                              handleTaskModelChange(task, newProvider, modelOptions[0] || "");
                            }}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            <option value="google">Google</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                          </select>
                          <select
                            value={taskModel.modelId}
                            onChange={(e) => handleTaskModelChange(task, taskModel.provider, e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            {getModelOptions(taskModel.provider).map((model) => (
                              <option key={model} value={model}>
                                {model}
                              </option>
                            ))}
                          </select>
                        </div>
                        {!hasKey && (
                          <p className="text-xs text-red-500">
                            API key for {taskModel.provider} is not configured.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

