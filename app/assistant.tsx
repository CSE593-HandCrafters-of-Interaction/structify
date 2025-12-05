"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChat } from "@ai-sdk/react";
import { loadTaskModels, loadApiKeys } from "@/lib/localStorage-settings-adapter";
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
import { StructifySidebar } from "@/components/structify/sidebar";
import { PromptPanel } from "@/components/structify/prompt-panel";
import { SettingsView } from "@/components/structify/settings-view";
import { PANEL_SLIDE_DURATION_MS } from "@/components/ui/panel";
import { useIsMobile } from "@/hooks/use-mobile";
import { loadChatHistory, saveChatHistory, clearChatHistory } from "@/lib/localStorage-history-adapter";
import type { PromptSet } from "@/lib/localStorage-prompts-adapter";
import { loadPromptSets, savePromptSet } from "@/lib/localStorage-prompts-adapter";
import type { PromptCardContent } from "@/components/structify/prompt-panel";

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
        body: () => {
          if (typeof window === "undefined") {
            return {
              userStudyMode: userStudyModeRef.current,
              provider: "google" as const,
              modelId: "gemini-2.5-pro",
              apiKey: "",
            };
          }
          
          const taskModels = loadTaskModels();
          const apiKeys = loadApiKeys();
          const chatModel = taskModels.chat;
          const apiKey = apiKeys[chatModel.provider];
          
          return {
            userStudyMode: userStudyModeRef.current,
            provider: chatModel.provider,
            modelId: chatModel.modelId,
            apiKey,
          };
        },
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
  const [currentPromptSet, setCurrentPromptSet] = useState<PromptSet | null>(null);
  const [shouldOpenWelcome, setShouldOpenWelcome] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isReloadingRef = useRef(false);
  
  const toggleUserStudyMode = useCallback(() => {
    setIsUserStudyMode((prev) => !prev);
    setCinematicIndex(0);
  }, []);

  const handleClearHistory = useCallback(() => {
    chat.setMessages([]);
    clearChatHistory();
  }, [chat]);

  const handleSelectPromptSet = useCallback((promptSet: PromptSet) => {
    setCurrentPromptSet(promptSet);
  }, []);

  const handleClosePanelForEdit = useCallback(() => {
    // Clear currentPromptSet to close the panel
    setCurrentPromptSet(null);
    setShouldOpenWelcome(false);
  }, []);

  const handleOpenWelcomeView = useCallback(() => {
    setCurrentPromptSet(null);
    setShouldOpenWelcome(true);
    // Reset the flag after the effect has had time to run
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShouldOpenWelcome(false);
      });
    });
  }, []);

  const handleReloadPromptSet = useCallback((promptSetId: string) => {
    if (typeof window !== "undefined") {
      isReloadingRef.current = true;
      const promptSets = loadPromptSets();
      const updatedPromptSet = promptSets.find(p => p.id === promptSetId);
      if (updatedPromptSet) {
        setCurrentPromptSet(updatedPromptSet);
      } else {
        // Prompt set was deleted, clear it
        setCurrentPromptSet(null);
      }
      isReloadingRef.current = false;
    }
  }, []);

  // Save prompt set to localStorage whenever it changes
  useEffect(() => {
    if (currentPromptSet && typeof window !== "undefined") {
      savePromptSet(currentPromptSet);
      window.dispatchEvent(new CustomEvent("prompt-set-saved"));
    }
  }, [currentPromptSet]);

  // Callback handlers for PromptPanel
  const handleUpdatePromptSet = useCallback((promptSet: PromptSet) => {
    setCurrentPromptSet(promptSet);
  }, []);

  const handleAddPrompt = useCallback((promptSetId: string) => {
    setCurrentPromptSet((prev) => {
      if (!prev || prev.id !== promptSetId) return prev;
      
      const newPrompt = {
        id: Date.now().toString(),
        title: "",
        content: { type: "bullet" as const, items: [] },
        isEditing: false,
        isIncluded: true,
      };
      
      return {
        ...prev,
        prompts: [...prev.prompts, newPrompt],
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleDeletePrompt = useCallback((promptSetId: string, promptId: string) => {
    setCurrentPromptSet((prev) => {
      if (!prev || prev.id !== promptSetId) return prev;
      
      return {
        ...prev,
        prompts: prev.prompts.filter(p => p.id !== promptId),
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleUpdatePrompt = useCallback((promptSetId: string, promptId: string, data: { title: string; content: PromptCardContent }) => {
    setCurrentPromptSet((prev) => {
      if (!prev || prev.id !== promptSetId) return prev;
      
      return {
        ...prev,
        prompts: prev.prompts.map(p => 
          p.id === promptId ? { ...p, title: data.title, content: data.content } : p
        ),
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleUpdateTitle = useCallback((promptSetId: string, title: string) => {
    setCurrentPromptSet((prev) => {
      if (!prev || prev.id !== promptSetId) return prev;
      
      return {
        ...prev,
        title,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleUpdateIncludeState = useCallback((promptSetId: string, promptId: string, isIncluded: boolean) => {
    setCurrentPromptSet((prev) => {
      if (!prev || prev.id !== promptSetId) return prev;
      
      return {
        ...prev,
        prompts: prev.prompts.map(p => 
          p.id === promptId ? { ...p, isIncluded } : p
        ),
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleUpdateEditingState = useCallback((promptSetId: string, promptId: string, isEditing: boolean) => {
    setCurrentPromptSet((prev) => {
      if (!prev || prev.id !== promptSetId) return prev;
      
      return {
        ...prev,
        prompts: prev.prompts.map(p => 
          p.id === promptId ? { ...p, isEditing } : p
        ),
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleReorderPrompts = useCallback((promptSetId: string, newOrder: string[]) => {
    setCurrentPromptSet((prev) => {
      if (!prev || prev.id !== promptSetId) return prev;
      
      // Create a map of prompts by ID for quick lookup
      const promptMap = new Map(prev.prompts.map(p => [p.id, p]));
      
      // Reorder prompts according to newOrder array
      const reorderedPrompts = newOrder
        .map(id => promptMap.get(id))
        .filter((p): p is typeof prev.prompts[0] => p !== undefined);
      
      // Add any prompts that weren't in newOrder (shouldn't happen, but safety check)
      const existingIds = new Set(newOrder);
      const remainingPrompts = prev.prompts.filter(p => !existingIds.has(p.id));
      
      return {
        ...prev,
        prompts: [...reorderedPrompts, ...remainingPrompts],
        updatedAt: Date.now(),
      };
    });
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
            <StructifySidebar
              structifyFeature={structifyFeature}
              onToggleStructifyFeature={toggleStructifyFeature}
              userStudyMode={isUserStudyMode}
              onToggleUserStudyMode={toggleUserStudyMode}
              onClearHistory={handleClearHistory}
              onSelectPromptSet={handleSelectPromptSet}
              currentPromptSetId={currentPromptSet?.id ?? null}
              onClosePanelForEdit={handleClosePanelForEdit}
              onReloadPromptSet={handleReloadPromptSet}
              onOpenWelcomeView={handleOpenWelcomeView}
              onSettingsClick={() => setIsSettingsOpen(true)}
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
              <PromptPanel 
                onWidthChange={setPromptPanelWidth}
                currentPromptSet={currentPromptSet}
                onUpdatePromptSet={handleUpdatePromptSet}
                onAddPrompt={handleAddPrompt}
                onDeletePrompt={handleDeletePrompt}
                onUpdatePrompt={handleUpdatePrompt}
                onUpdateTitle={handleUpdateTitle}
                onUpdateIncludeState={handleUpdateIncludeState}
                onUpdateEditingState={handleUpdateEditingState}
                onReorderPrompts={handleReorderPrompts}
                shouldOpenWelcome={shouldOpenWelcome}
              />
            )}
          </div>
          <SettingsView open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </SidebarProvider>
      </CinematicProvider>
    </AssistantRuntimeProvider>
  );
};
