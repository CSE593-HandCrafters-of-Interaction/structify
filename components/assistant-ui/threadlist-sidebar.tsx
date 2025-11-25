import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { StructifyIcon } from "../logo/structify";

type ThreadListSidebarProps = React.ComponentProps<typeof Sidebar> & {
  structifyFeature: boolean;
  onToggleStructifyFeature: () => void;
};

export function ThreadListSidebar({
  structifyFeature,
  onToggleStructifyFeature,
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
      <SidebarRail />
    </Sidebar>
  );
}
