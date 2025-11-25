"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import cinematicScript from "@/data/cinematic.json";
import { CinematicProvider } from "@/context/cinematic-context";
import { Thread } from "@/components/assistant-ui/thread";
import {
  SidebarExpandTrigger,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { PromptPanel } from "@/components/assistant-ui/prompt-panel";
import { PANEL_SLIDE_DURATION_MS } from "@/components/ui/panel";

type AssistantThreadMessage = UIMessage & {
  content: string;
};

const cinematicPrompts = Array.isArray(cinematicScript)
  ? (cinematicScript as unknown[])
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0)
  : [];

export const Assistant = () => {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<AssistantThreadMessage>({
        api: "/api/chat",
      }),
    [],
  );

  const chat = useChat<AssistantThreadMessage>({
    transport,
  });

  // 3. Runtime creation
  const runtime = useAISDKRuntime(chat);
  const [cinematicIndex, setCinematicIndex] = useState(0);
  const [isSendingCinematic, setIsSendingCinematic] = useState(false);
  const [structifyFeature, setStructifyFeature] = useState(false);
  const [promptPanelWidth, setPromptPanelWidth] = useState(0);

  // 4. Wait for client-side mount to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const nextPrompt = cinematicPrompts[cinematicIndex] ?? null;
  const nextPromptLabel =
    nextPrompt === null
      ? null
      : nextPrompt.length > 48
        ? `${nextPrompt.slice(0, 48)}…`
        : nextPrompt;
  const hasNextPrompt = Boolean(nextPrompt);

  const sendNextPrompt = useCallback(async () => {
    if (
      !hasNextPrompt ||
      isSendingCinematic ||
      !nextPrompt ||
      chat.status !== "ready"
    ) {
      return;
    }

    try {
      setIsSendingCinematic(true);
      await chat.sendMessage({ text: nextPrompt });
      setCinematicIndex((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to send cinematic prompt:", error);
    } finally {
      setIsSendingCinematic(false);
    }
  }, [chat, hasNextPrompt, isSendingCinematic, nextPrompt]);

  const cinematicContextValue = useMemo(
    () => ({
      hasNextPrompt,
      isSendingPrompt: isSendingCinematic || chat.status !== "ready",
      nextPromptLabel,
      sendNextPrompt,
    }),
    [
      chat.status,
      hasNextPrompt,
      isSendingCinematic,
      nextPromptLabel,
      sendNextPrompt,
    ],
  );

  const toggleStructifyFeature = useCallback(() => {
    setStructifyFeature((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!structifyFeature) {
      setPromptPanelWidth(0);
    }
  }, [structifyFeature]);

  if (!isMounted) {
    return null;
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <CinematicProvider value={cinematicContextValue}>
        <SidebarProvider>
          <div className="flex h-dvh w-full pr-0.5">
            <ThreadListSidebar
              structifyFeature={structifyFeature}
              onToggleStructifyFeature={toggleStructifyFeature}
            />
            <SidebarInset>
              <SidebarExpandTrigger />
              <div
                className="flex-1 overflow-hidden"
                style={{
                  paddingRight: structifyFeature ? promptPanelWidth : 0,
                  transition: `padding-right ${PANEL_SLIDE_DURATION_MS}ms ease`,
                }}
              >
                <Thread structifyFeature={structifyFeature} />
              </div>
            </SidebarInset>
            {structifyFeature && (
              <PromptPanel onWidthChange={setPromptPanelWidth} />
            )}
          </div>
        </SidebarProvider>
      </CinematicProvider>
    </AssistantRuntimeProvider>
  );
};
