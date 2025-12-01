import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadList } from "@/components/structify/threadlist";
import { PromptList } from "@/components/structify/promptlist";
import { StructifyIcon } from "../logo/structify";
import { Monitor, FlaskConical, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PromptSet } from "@/lib/localStorage-prompts-adapter";
import { savePromptSet } from "@/lib/localStorage-prompts-adapter";
import type { PromptItem } from "@/components/structify/prompt-panel";

type ThreadListSidebarProps = React.ComponentProps<typeof Sidebar> & {
  structifyFeature: boolean;
  onToggleStructifyFeature: () => void;
  userStudyMode: boolean;
  onToggleUserStudyMode: () => void;
  onClearHistory?: () => void;
  onSelectPromptSet?: (promptSet: PromptSet) => void;
  currentPromptSetId?: string | null;
  onClosePanelForEdit?: () => void;
  onReloadPromptSet?: (promptSetId: string) => void;
};

export function ThreadListSidebar({
  structifyFeature,
  onToggleStructifyFeature,
  userStudyMode,
  onToggleUserStudyMode,
  onClearHistory,
  onSelectPromptSet,
  currentPromptSetId,
  onClosePanelForEdit,
  onReloadPromptSet,
  ...props
}: ThreadListSidebarProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleCreateNew = React.useCallback(() => {
    const newPromptSet: PromptSet = {
      id: `prompt-set-${Date.now()}`,
      title: "New Prompt Set",
      prompts: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    savePromptSet(newPromptSet);
    window.dispatchEvent(new CustomEvent("prompt-set-saved"));
    onSelectPromptSet?.(newPromptSet);
  }, [onSelectPromptSet]);

  const handleImportClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImport = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = String(e.target?.result ?? "");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const json = JSON.parse(text) as any;

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
          const panelTitle = json && typeof json === "object" && typeof json.panelTitle === "string" && json.panelTitle.length > 0
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
            let content: PromptItem["content"];

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

          const importedPromptSet: PromptSet = {
            id: `prompt-set-${Date.now()}`,
            title: panelTitle,
            prompts: normalized,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          savePromptSet(importedPromptSet);
          window.dispatchEvent(new CustomEvent("prompt-set-saved"));
          onSelectPromptSet?.(importedPromptSet);
        } catch (err) {
          console.error("Failed to import prompts:", err);
          alert("Failed to import structured prompts. Please check the file format.");
        } finally {
          event.target.value = "";
        }
      };

      reader.readAsText(file);
    },
    [onSelectPromptSet],
  );

  return (
    <Sidebar {...props}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />
      <SidebarHeader className="aui-sidebar-header mb-2 border-b">
        <div className="aui-sidebar-header-content flex items-center justify-between">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                aria-pressed={structifyFeature}
                onClick={onToggleStructifyFeature}
                title={
                  structifyFeature
                    ? "Hide structured prompts panel"
                    : "Show structured prompts panel"
                }
              >
                <div className="aui-sidebar-header-icon-wrapper flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <StructifyIcon className="aui-sidebar-header-icon size-4" />
                </div>
                <div className="aui-sidebar-header-heading mr-6 flex flex-col gap-0.5 leading-none">
                  <span className="aui-sidebar-header-title font-semibold">
                    Structify
                  </span>
                  <span className="aui-sidebar-header-subtitle text-xs text-muted-foreground">
                    {structifyFeature ? "Features on" : "Features off"}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="ml-2 shrink-0" size="icon" />
        </div>
      </SidebarHeader>
      <SidebarContent className="aui-sidebar-content px-2 gap-0">
        <ThreadList onClearHistory={onClearHistory} />
        {structifyFeature && (
          <>
            <div className="mt-2 border-t pt-2">
              <div className="px-3 flex flex-row gap-1.5">
                <Button
                  onClick={handleCreateNew}
                  variant="ghost"
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-center hover:bg-muted"
                >
                  <Plus className="size-4" />
                  New
                </Button>
                <Button
                  onClick={handleImportClick}
                  variant="ghost"
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-center hover:bg-muted"
                >
                  <Download className="size-4" />
                  Import
                </Button>
              </div>
            </div>
            <div className="mt-2 border-t pt-4">
              <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase">
                Saved Prompts
              </div>
              <PromptList 
                onSelectPromptSet={onSelectPromptSet}
                currentPromptSetId={currentPromptSetId}
                onClosePanelForEdit={onClosePanelForEdit}
                onReloadPromptSet={onReloadPromptSet}
              />
            </div>
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              aria-pressed={userStudyMode}
              onClick={onToggleUserStudyMode}
              title={
                userStudyMode
                  ? "Switch to Normal Mode"
                  : "Switch to User Study Mode"
              }
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {userStudyMode ? (
                    <FlaskConical className="size-4" aria-hidden="true" />
                  ) : (
                    <Monitor className="size-4" aria-hidden="true" />
                  )}
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-sm font-medium">
                    {userStudyMode ? "User Study Mode" : "Normal Mode"}
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
