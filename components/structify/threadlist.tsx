import type { FC } from "react";
import { ThreadListPrimitive } from "@assistant-ui/react";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

type ThreadListProps = {
  onClearHistory?: () => void;
};

export const ThreadList: FC<ThreadListProps> = ({ onClearHistory }) => {
  return (
    <ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex flex-col items-stretch gap-1.5">
      {onClearHistory && <ThreadListClear onClear={onClearHistory} />}
    </ThreadListPrimitive.Root>
  );
};

const ThreadListClear: FC<{ onClear: () => void }> = ({ onClear }) => {
  return (
    <Button
      onClick={onClear}
      className="aui-thread-list-clear flex items-center justify-start gap-1 rounded-lg px-2.5 py-2 text-start hover:bg-muted"
      variant="ghost"
    >
      <Trash2Icon className="size-4" />
      Clear Chat History
    </Button>
  );
};
