"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import cinematicScript from "@/data/cinematic.json";
import { CinematicProvider } from "@/context/cinematic-context";
import { Thread } from "@/components/structify/thread";
import {
  SidebarExpandTrigger,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/structify/threadlist-sidebar";
import { PromptPanel } from "@/components/structify/prompt-panel";
import { PANEL_SLIDE_DURATION_MS } from "@/components/ui/panel";
import { useIsMobile } from "@/hooks/use-mobile";
import { loadChatHistory, saveChatHistory } from "@/lib/localStorage-history-adapter";

type AssistantThreadMessage = UIMessage & {
  content: string;
};

const cinematicPrompts = Array.isArray(cinematicScript)
  ? (cinematicScript as unknown[])
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0)
  : [];
const CINEMATIC_LABEL_DESKTOP_LENGTH = 48;
const CINEMATIC_LABEL_MOBILE_LENGTH = 28;

export const Assistant = () => {
  const [isUserStudyMode, setIsUserStudyMode] = useState(false);
  const userStudyModeRef = useRef(isUserStudyMode);
  userStudyModeRef.current = isUserStudyMode;
  const transport = useMemo(
    () =>
      new DefaultChatTransport<AssistantThreadMessage>({
        api: "/api/chat",
        body: () => ({
          userStudyMode: userStudyModeRef.current,
        }),
      }),
    [userStudyModeRef],
  );

  const chat = useChat<AssistantThreadMessage>({
    transport,
    id: "assistant-chat", // Stable ID for the chat session
  });

  // Load messages from localStorage on mount (only once)
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && !hasLoadedHistory && chat.messages.length === 0) {
      const savedMessages = loadChatHistory();
      if (savedMessages && savedMessages.length > 0) {
        // Cast to AssistantThreadMessage since we know the structure we saved
        chat.setMessages(savedMessages as AssistantThreadMessage[]);
      }
      setHasLoadedHistory(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedHistory]); // Only run once

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && chat.messages.length > 0) {
      saveChatHistory(chat.messages);
    }
  }, [chat.messages]);

  // 3. Runtime creation
  const runtime = useAISDKRuntime(chat);
  const [cinematicIndex, setCinematicIndex] = useState(0);
  const [isSendingCinematic, setIsSendingCinematic] = useState(false);
  const [structifyFeature, setStructifyFeature] = useState(false);
  const [promptPanelWidth, setPromptPanelWidth] = useState(0);
  const toggleUserStudyMode = useCallback(() => {
    setIsUserStudyMode((prev) => !prev);
    setCinematicIndex(0);
  }, []);

  const isMobileViewport = useIsMobile();
  const shouldHideSidebarTrigger = isMobileViewport && promptPanelWidth > 0;

  // 4. Wait for client-side mount to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);


  const nextPrompt = cinematicPrompts[cinematicIndex] ?? null;
  const nextPromptLabel = useMemo(() => {
    if (nextPrompt === null) {
      return null;
    }

    const maxLength = isMobileViewport
      ? CINEMATIC_LABEL_MOBILE_LENGTH
      : CINEMATIC_LABEL_DESKTOP_LENGTH;

    return nextPrompt.length > maxLength
      ? `${nextPrompt.slice(0, maxLength)}…`
      : nextPrompt;
  }, [isMobileViewport, nextPrompt]);
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
    if (!isUserStudyMode) {
      setStructifyFeature(true);
      setCinematicIndex(cinematicPrompts.length);
    }
  }, [isUserStudyMode, setStructifyFeature, setCinematicIndex]);

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
              userStudyMode={isUserStudyMode}
              onToggleUserStudyMode={toggleUserStudyMode}
            />
            <SidebarInset>
              <SidebarExpandTrigger hidden={shouldHideSidebarTrigger} />
              <div
                className="flex-1 overflow-hidden"
                style={{
                  paddingRight: structifyFeature && !isMobileViewport ? promptPanelWidth : 0,
                  transition: `padding-right ${PANEL_SLIDE_DURATION_MS}ms ease`,
                }}
              >
                <Thread
                  structifyFeature={structifyFeature}
                  userStudyMode={isUserStudyMode}
                />
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
