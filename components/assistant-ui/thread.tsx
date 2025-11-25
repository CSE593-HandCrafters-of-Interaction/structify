import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  InboxIcon,
  Loader2Icon,
  PencilIcon,
  PlayIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  Square,
  Trash2Icon,
} from "lucide-react";

import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantApi,
  useAssistantState,
} from "@assistant-ui/react";

import type {
  ThreadAssistantMessagePart,
  ThreadMessage,
  ThreadUserMessagePart,
} from "@assistant-ui/react";

import { type FC, useCallback, useMemo, createContext, useContext } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import * as m from "motion/react-m";

import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";

import { cn } from "@/lib/utils";
import { dispatchPromptCollect } from "@/lib/prompt-collector";
import { useOptionalCinematicContext } from "@/context/cinematic-context";
type ThreadProps = {
  structifyFeature?: boolean;
  userStudyMode?: boolean;
};

const StructifyFeatureContext = createContext(true);

const useStructifyFeature = () => useContext(StructifyFeatureContext);

export const Thread: FC<ThreadProps> = ({
  structifyFeature = true,
  userStudyMode = true,
}) => {
  return (
    <StructifyFeatureContext.Provider value={structifyFeature}>
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion="user">
          <ThreadPrimitive.Root
            className="aui-root aui-thread-root @container flex h-full flex-col bg-background"
            style={{
              ["--thread-max-width" as string]: "44rem",
            }}
          >
            <ThreadPrimitive.Viewport className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll px-4">
              <ThreadPrimitive.If empty>
                <ThreadWelcome userStudyMode={userStudyMode} />
              </ThreadPrimitive.If>

              <ThreadPrimitive.Messages
                components={{
                  UserMessage,
                  EditComposer,
                  AssistantMessage,
                }}
              />

              <ThreadPrimitive.If empty={false}>
                <div className="aui-thread-viewport-spacer min-h-8 grow" />
              </ThreadPrimitive.If>

              <Composer />
            </ThreadPrimitive.Viewport>
          </ThreadPrimitive.Root>
        </MotionConfig>
      </LazyMotion>
    </StructifyFeatureContext.Provider>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible dark:bg-background dark:hover:bg-accent"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC<{ userStudyMode: boolean }> = ({ userStudyMode }) => {
  return (
    <div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
      <div className="aui-thread-welcome-center flex w-full flex-grow flex-col items-center justify-center">
        <div className="aui-thread-welcome-message flex size-full flex-col justify-center px-8">
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="aui-thread-welcome-message-motion-1 text-2xl font-semibold"
          >
            Welcome to Structify!
          </m.div>
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.1 }}
            className="aui-thread-welcome-message-motion-2 text-xl text-muted-foreground/65"
          >
            {userStudyMode
              ? "Play all preset prompts below, and then explore."
              : "Structure your thoughts as you go."}
          </m.div>
        </div>
      </div>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <div className="aui-composer-wrapper sticky bottom-0 mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 overflow-visible rounded-t-3xl bg-background pb-4 md:pb-6">
      <ThreadScrollToBottom />
      <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col rounded-3xl border border-border bg-muted px-1 pt-2 shadow-[0_9px_9px_0px_rgba(0,0,0,0.01),0_2px_5px_0px_rgba(0,0,0,0.06)] dark:border-muted-foreground/15">
        <ComposerAttachments />
        <ComposerPrimitive.Input
          placeholder="Send a message..."
          className="aui-composer-input mb-1 max-h-32 min-h-16 w-full resize-none bg-transparent px-3.5 pt-1.5 pb-3 text-base outline-none placeholder:text-muted-foreground focus:outline-primary"
          rows={1}
          autoFocus
          aria-label="Message input"
        />
        <ComposerAction />
      </ComposerPrimitive.Root>
    </div>
  );
};

const ComposerAction: FC = () => {
  return (
    <div className="aui-composer-action-wrapper relative mx-1 mt-2 mb-2 flex items-center justify-between">
      <ComposerAddAttachment />
      <CinematicAdvanceButton />

      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send message"
            side="bottom"
            type="submit"
            variant="default"
            size="icon"
            className="aui-composer-send size-[34px] rounded-full p-1"
            aria-label="Send message"
          >
            <ArrowUpIcon className="aui-composer-send-icon size-5" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>

      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="aui-composer-cancel size-[34px] rounded-full border border-muted-foreground/60 hover:bg-primary/75 dark:border-muted-foreground/90"
            aria-label="Stop generating"
          >
            <Square className="aui-composer-cancel-icon size-3.5 fill-white dark:fill-black" />
          </Button>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </div>
  );
};

const CinematicAdvanceButton: FC = () => {
  const cinematic = useOptionalCinematicContext();

  if (!cinematic) {
    return null;
  }

  const {
    hasNextPrompt,
    isSendingPrompt,
    sendNextPrompt,
    nextPromptLabel,
  } = cinematic;

  if (!hasNextPrompt && !isSendingPrompt) {
    return null;
  }

  const label =
    nextPromptLabel ?? (hasNextPrompt ? "Play scripted prompt" : "Waiting…");

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="aui-composer-cinematic-button mr-auto ml-2 flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium"
      disabled={!hasNextPrompt || isSendingPrompt}
      onClick={sendNextPrompt}
    >
      {isSendingPrompt ? (
        <Loader2Icon className="mr-1 size-4 animate-spin" />
      ) : (
        <PlayIcon className="mr-1 size-4" />
      )}
      {isSendingPrompt ? "Sending…" : label}
    </Button>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root asChild>
      <div
        className="aui-assistant-message-root relative mx-auto w-full max-w-[var(--thread-max-width)] animate-in py-4 duration-150 ease-out fade-in slide-in-from-bottom-1 last:mb-24"
        data-role="assistant"
      >
        <div className="aui-assistant-message-content mx-2 leading-7 break-words text-foreground">
          <MessagePrimitive.Parts
            components={{
              Text: MarkdownText,
              tools: { Fallback: ToolFallback },
            }}
          />
          <MessageError />
        </div>

        <div className="aui-assistant-message-footer mt-2 ml-2 flex">
          <BranchPicker />
          <AssistantActionBar />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  const structifyFeature = useStructifyFeature();

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="aui-assistant-action-bar-root col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground data-floating:absolute data-floating:rounded-md data-floating:border data-floating:bg-background data-floating:p-1 data-floating:shadow-sm"
    >
      {structifyFeature && (
        <>
          <CollectPromptButton className="aui-assistant-action-collect size-6 p-1.5" />
          <RewindButton />
        </>
      )}
      <DeleteRoundButton />
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root asChild>
      <div
        className="aui-user-message-root mx-auto grid w-full max-w-[var(--thread-max-width)] animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 px-2 py-4 duration-150 ease-out fade-in slide-in-from-bottom-1 first:mt-3 last:mb-5 [&:where(>*)]:col-start-2"
        data-role="user"
      >
        <UserMessageAttachments />

        <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
          <div className="aui-user-message-content rounded-3xl bg-muted px-5 py-2.5 break-words text-foreground">
            <MessagePrimitive.Parts />
          </div>
          <div className="aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2">
            <UserActionBar />
          </div>
        </div>

        <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
      </div>
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <CollectPromptButton className="aui-user-action-collect p-4" />
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

type CollectPromptButtonProps = {
  className?: string;
};

const CollectPromptButton: FC<CollectPromptButtonProps> = ({ className }) => {
  const message = useAssistantState(({ message }) => message);

  const collectableLines = useMemo(() => {
    const splitLines = (text: string | undefined) =>
      (text ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (message.role === "user") {
      return (message.content as ThreadUserMessagePart[])
        .flatMap((part) => {
          if (part.type !== "text" || !part.text) {
            return [];
          }

          return splitLines(part.text);
        });
    }

    if (message.role === "assistant") {
      return (message.content as ThreadAssistantMessagePart[])
        .flatMap((part) => {
          if (part.type === "text" || part.type === "reasoning") {
            return splitLines(part.text);
          }

          return [];
        });
    }

    return [];
  }, [message.content, message.role]);

  const canCollect = collectableLines.length > 0;

  const handleCollect = useCallback(() => {
    if (!canCollect) {
      return;
    }

    const title = "";

    dispatchPromptCollect({
      messageId: message.id,
      title,
      content: collectableLines,
    });
  }, [canCollect, collectableLines, message.id]);

  if (message.role !== "user" && message.role !== "assistant") {
    return null;
  }

  return (
    <TooltipIconButton
      tooltip="Collect prompt"
      aria-label="Collect prompt"
      onClick={handleCollect}
      disabled={!canCollect}
      className={cn("aui-collect-prompt-button", className)}
    >
      <InboxIcon className="size-4" />
    </TooltipIconButton>
  );
};

type AssistantMessageState = Extract<ThreadMessage, { role: "assistant" }>;
type UserMessageState = Extract<ThreadMessage, { role: "user" }>;

const splitMessageLines = (text?: string) =>
  (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const extractUserLines = (message: UserMessageState) => {
  return message.content.flatMap((part: ThreadUserMessagePart) => {
    if (part.type !== "text" || !part.text) {
      return [];
    }

    return splitMessageLines(part.text);
  });
};

const extractAssistantLines = (message: AssistantMessageState) => {
  return message.content.flatMap((part: ThreadAssistantMessagePart) => {
    if ((part.type === "text" || part.type === "reasoning") && part.text) {
      return splitMessageLines(part.text);
    }

    return [];
  });
};

const buildPromptContent = (userLines: string[], assistantLines: string[]) => {
  const userSection = userLines.length > 0 ? userLines : ["(no text)"];
  const assistantSection =
    assistantLines.length > 0 ? assistantLines : ["(no text)"];

  return ["User:", ...userSection, "Assistant:", ...assistantSection];
};

type ConversationRound = {
  user: UserMessageState;
  assistant: AssistantMessageState;
};

type ThreadRuntimeApi = ReturnType<
  ReturnType<typeof useAssistantApi>["thread"]
>;

const removeRoundFromThread = (
  threadRuntime: ThreadRuntimeApi,
  round: ConversationRound,
) => {
  const repository = threadRuntime.export();
  const idsToRemove = new Set([round.assistant.id, round.user.id]);

  const userEntry = repository.messages.find(
    ({ message }) => message.id === round.user.id,
  );
  const assistantEntry = repository.messages.find(
    ({ message }) => message.id === round.assistant.id,
  );

  if (!userEntry || !assistantEntry) {
    return false;
  }

  const currentHeadId = repository.headId ?? null;
  const shouldReplaceHead =
    currentHeadId !== null && idsToRemove.has(currentHeadId);
  const nextHeadId = shouldReplaceHead
    ? userEntry.parentId ?? null
    : currentHeadId;

  threadRuntime.import({
    headId: nextHeadId,
    messages: repository.messages.filter(
      ({ message }) => !idsToRemove.has(message.id),
    ),
  });

  return true;
};

const getLastRound = (
  messages: readonly ThreadMessage[],
): ConversationRound | null => {
  if (messages.length < 2) {
    return null;
  }

  const assistant = messages[messages.length - 1];
  const user = messages[messages.length - 2];

  if (!assistant || !user) {
    return null;
  }

  if (assistant.role !== "assistant" || user.role !== "user") {
    return null;
  }

  return {
    assistant,
    user,
  };
};

const useLastRoundActionEligibility = () => {
  const message = useAssistantState(({ message }) => message);
  const isRunning = useAssistantState(({ thread }) => thread.isRunning);

  const lastAssistantId = useAssistantState(({ thread }) => {
    const lastAssistant =
      thread.messages.length > 0
        ? thread.messages[thread.messages.length - 1]
        : undefined;

    return lastAssistant?.role === "assistant" ? lastAssistant.id : undefined;
  });

  const hasUserBefore = useAssistantState(({ thread }) => {
    const { messages } = thread;
    const lastAssistant =
      messages.length > 0 ? messages[messages.length - 1] : undefined;
    const previous =
      messages.length > 1 ? messages[messages.length - 2] : undefined;

    return Boolean(
      lastAssistant?.role === "assistant" && previous?.role === "user",
    );
  });

  const isAssistantMessage = message.role === "assistant";

  const canAct =
    isAssistantMessage &&
    message.isLast &&
    !isRunning &&
    hasUserBefore &&
    lastAssistantId === message.id;

  return { message, canAct, isAssistantMessage };
};

const RewindButton: FC = () => {
  const api = useAssistantApi();
  const { message, canAct, isAssistantMessage } = useLastRoundActionEligibility();

  const handleRewind = useCallback(() => {
    if (!canAct || !isAssistantMessage) {
      return;
    }

    const threadRuntime = api.thread();
    const { messages } = threadRuntime.getState();
    const round = getLastRound(messages);

    if (!round || round.assistant.id !== message.id) {
      return;
    }

    const userLines = extractUserLines(round.user);
    const assistantLines = extractAssistantLines(round.assistant);
    const promptContent = buildPromptContent(userLines, assistantLines);
    const title = "";

    dispatchPromptCollect({
      messageId: round.assistant.id,
      title,
      content: promptContent,
    });

    removeRoundFromThread(threadRuntime, round);
  }, [api, canAct, isAssistantMessage, message.id]);

  if (!isAssistantMessage) {
    return null;
  }

  return (
    <TooltipIconButton
      tooltip="Rewind last round"
      aria-label="Rewind last round"
      className="aui-assistant-action-rewind size-6 p-1.5"
      onClick={handleRewind}
      disabled={!canAct}
    >
      <RotateCcwIcon />
    </TooltipIconButton>
  );
};

const DeleteRoundButton: FC = () => {
  const api = useAssistantApi();
  const { message, canAct, isAssistantMessage } = useLastRoundActionEligibility();

  const handleDelete = useCallback(() => {
    if (!canAct || !isAssistantMessage) {
      return;
    }

    const threadRuntime = api.thread();
    const { messages } = threadRuntime.getState();
    const round = getLastRound(messages);

    if (!round || round.assistant.id !== message.id) {
      return;
    }

    removeRoundFromThread(threadRuntime, round);
  }, [api, canAct, isAssistantMessage, message.id]);

  if (!isAssistantMessage) {
    return null;
  }

  return (
    <TooltipIconButton
      tooltip="Delete last round"
      aria-label="Delete last round"
      className="aui-assistant-action-delete size-6 p-1.5"
      onClick={handleDelete}
      disabled={!canAct}
    >
      <Trash2Icon />
    </TooltipIconButton>
  );
};

const EditComposer: FC = () => {
  return (
    <div className="aui-edit-composer-wrapper mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 px-2 first:mt-4">
      <ComposerPrimitive.Root className="aui-edit-composer-root ml-auto flex w-full max-w-7/8 flex-col rounded-xl bg-muted">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input flex min-h-[60px] w-full resize-none bg-transparent p-4 text-foreground outline-none"
          autoFocus
        />

        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center justify-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm" aria-label="Cancel edit">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm" aria-label="Update message">
              Update
            </Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-xs text-muted-foreground",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
