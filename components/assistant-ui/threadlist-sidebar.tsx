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
import { ThreadList } from "@/components/assistant-ui/threadlist";
import { StructifyIcon } from "../logo/structify";
import { Monitor, FlaskConical } from "lucide-react";

type ThreadListSidebarProps = React.ComponentProps<typeof Sidebar> & {
  structifyFeature: boolean;
  onToggleStructifyFeature: () => void;
  userStudyMode: boolean;
  onToggleUserStudyMode: () => void;
};

export function ThreadListSidebar({
  structifyFeature,
  onToggleStructifyFeature,
  userStudyMode,
  onToggleUserStudyMode,
  ...props
}: ThreadListSidebarProps) {
  return (
    <Sidebar {...props}>
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
      <SidebarContent className="aui-sidebar-content px-2">
        <ThreadList />
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
