"use client";

import {
  useState,
  useEffect,
  useRef,
  type ComponentProps,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { PanelRightClose, PanelRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PANEL_SLIDE_DURATION_MS = 300;

type PanelProps = ComponentProps<"div"> & {
  open: boolean;
  floating?: boolean;
  width: number;
};

export function Panel({
  open,
  floating = false,
  width,
  className,
  style,
  children,
  ...props
}: PanelProps) {
  const mergedStyle: CSSProperties = {
    ...style,
    width,
  };

  return (
    <div
      style={mergedStyle}
      className={cn(
        floating
          ? "fixed top-0 right-0 h-full border-l bg-background transition-transform duration-300"
          : "relative h-full border-l bg-background",
        !open && (floating ? "translate-x-full" : "hidden"),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type PanelTriggerProps = ComponentProps<typeof Button> & {
  srLabel?: string;
};

export const PanelTrigger = ({
  onClick,
  className,
  srLabel = "Close panel",
  ...props
}: PanelTriggerProps) => (
  <Button
    data-panel="trigger"
    data-slot="panel-trigger"
    variant="ghost"
    size="icon"
    className={cn("size-7", className)}
    onClick={(event) => {
      event.preventDefault();
      onClick?.(event);
    }}
    {...props}
  >
    <PanelRightClose className="size-4" />
    <span className="sr-only">{srLabel}</span>
  </Button>
);

type PanelExpandTriggerProps = {
  isOpen: boolean;
  onOpen: () => void;
  className?: string;
  srLabel?: string;
};

export const PanelExpandTrigger = ({
  isOpen,
  onOpen,
  className,
  srLabel = "Open panel",
}: PanelExpandTriggerProps) => {
  const [canShow, setCanShow] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnimationFrame = useRef<number | null>(null);
  const delayTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCanShow(false);
      setIsVisible(false);
      if (fadeAnimationFrame.current !== null) {
        window.cancelAnimationFrame(fadeAnimationFrame.current);
        fadeAnimationFrame.current = null;
      }
      if (delayTimer.current !== null) {
        window.clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
      return;
    }

    setCanShow(false);
    setIsVisible(false);
    delayTimer.current = window.setTimeout(() => {
      setCanShow(true);
      fadeAnimationFrame.current = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }, PANEL_SLIDE_DURATION_MS);

    return () => {
      if (delayTimer.current !== null) {
        window.clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
      if (fadeAnimationFrame.current !== null) {
        window.cancelAnimationFrame(fadeAnimationFrame.current);
        fadeAnimationFrame.current = null;
      }
    };
  }, [isOpen]);

  if (isOpen || !canShow) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed top-5 right-9 z-50 opacity-0 transition-opacity duration-300",
        isVisible && "opacity-100",
        className,
      )}
    >
      <Button
        size="icon"
        variant="ghost"
        onClick={onOpen}
        aria-label={srLabel}
        className="pointer-events-auto shadow-md size-7"
      >
        <PanelRight />
      </Button>
    </div>
  );
};

type PanelResizerProps = {
  open: boolean;
  width: number;
  minWidth: number;
  maxWidth: number;
  onResize: (nextWidth: number) => void;
  className?: string;
};

export function PanelResizer({
  open,
  width,
  minWidth,
  maxWidth,
  onResize,
  className,
}: PanelResizerProps) {
  const clampWidth = (value: number) =>
    Math.min(maxWidth, Math.max(minWidth, value));

  const startResize = (clientX: number | null) => {
    if (clientX === null) {
      return;
    }

    const startX = clientX;
    const startWidth = width;
    const initialCursor = document.body.style.cursor;
    const initialUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const updateWidth = (nextClientX: number) => {
      const delta = startX - nextClientX;
      onResize(clampWidth(startWidth + delta));
    };

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      updateWidth(event.clientX);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        return;
      }
      event.preventDefault();
      updateWidth(event.touches[0].clientX);
    };

    const cleanup = () => {
      document.body.style.cursor = initialCursor;
      document.body.style.userSelect = initialUserSelect;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };

    const handleMouseUp = () => {
      cleanup();
    };

    const handleTouchEnd = () => {
      cleanup();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    startResize(event.clientX);
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    event.preventDefault();
    startResize(touch.clientX);
  };

  if (!open) {
    return null;
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      className={cn(
        "absolute left-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none",
        className,
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2 rounded bg-border" />
    </div>
  );
}

export { PANEL_SLIDE_DURATION_MS };

