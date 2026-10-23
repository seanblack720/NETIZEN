"use client";

import { Bookmark, Forward, MessageCircle, Star, Users } from "lucide-react";
import { useEffect, useRef } from "react";

type PostActionBarProps = {
  highlighted?: boolean;
  highlightCount?: number;
  commentCount?: number;
  viewCount?: number;
  shareCount?: number;
  bookmarked?: boolean;
  onHighlight?: () => void;
  onHighlightLongPress?: () => void;
  onComment?: () => void;
  onViews?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  /** Show small numbers next to each icon */
  showCounts?: boolean;
};

const clean = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));
const short = (value: number) => (value > 99 ? "99+" : String(value));

const sideButtonBase =
  "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full transition active:scale-95";
const sideButtonIdle =
  "text-[#65756f] hover:text-[#168b45] dark:text-[#9bb0a8] dark:hover:text-[#7ee0b0]";
const sideButtonActive = "text-[#168b45] dark:text-[#7ee0b0]";

function ActionButton({
  label,
  onClick,
  count,
  showCount,
  active,
  pressed,
  children,
}: {
  label: string;
  onClick?: () => void;
  count?: number;
  showCount?: boolean;
  active?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  const value = clean(count);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={`${sideButtonBase} ${active ? sideButtonActive : sideButtonIdle}`}
    >
      {children}
      {showCount && value > 0 && (
        <span className="text-xs font-medium tabular-nums">{short(value)}</span>
      )}
    </button>
  );
}

export function PostActionBar({
  highlighted = false,
  highlightCount,
  commentCount,
  viewCount,
  shareCount,
  bookmarked = false,
  onHighlight,
  onHighlightLongPress,
  onComment,
  onViews,
  onShare,
  onBookmark,
  showCounts = true,
}: PostActionBarProps) {
  const highlights = clean(highlightCount);
  const showHighlightCount = showCounts && highlights > 0;

  // Long press on the star opens the reaction picker, a normal tap highlights
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Clear the timer if the component unmounts mid-press
  useEffect(() => clearHoldTimer, []);

  const startPress = () => {
    longPressTriggeredRef.current = false;
    clearHoldTimer();
    if (!onHighlightLongPress) return;
    holdTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onHighlightLongPress();
      try {
        if (typeof navigator !== "undefined") navigator.vibrate?.(20);
      } catch {}
    }, 450);
  };

  const handleHighlightClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onHighlight?.();
  };

  return (
    <div className="flex w-full items-center justify-between gap-1 rounded-full bg-[#e6f4ec] p-1 dark:bg-[#143a26]">
      {/* Highlight: circle when 0, pill with a count circle when above 0 */}
      <button
        type="button"
        aria-label={highlighted ? "Remove highlight" : "Highlight"}
        aria-pressed={highlighted}
        title={highlighted ? "Remove highlight" : "Highlight (long-press for reactions)"}
        onPointerDown={startPress}
        onPointerUp={clearHoldTimer}
        onPointerLeave={clearHoldTimer}
        onPointerCancel={clearHoldTimer}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleHighlightClick}
        className={`flex h-10 shrink-0 touch-manipulation select-none items-center rounded-full text-white shadow-sm transition active:scale-95 [-webkit-touch-callout:none] ${
          showHighlightCount ? "gap-0.5 pr-1.5" : "w-10 justify-center"
        } ${
          highlighted
            ? "bg-[#1c9d57] dark:bg-[#1f7a46]"
            : "bg-[#6fb08a] dark:bg-[#1f7a46]/70"
        }`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center">
          <Star
            size={20}
            strokeWidth={2.2}
            className={highlighted ? "fill-white" : ""}
            aria-hidden="true"
          />
        </span>

        {showHighlightCount && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-white px-1.5 text-xs font-bold leading-none tabular-nums text-[#168b45] dark:bg-[#0f1f18] dark:text-[#7ee0b0]">
            {short(highlights)}
          </span>
        )}
      </button>

      <ActionButton label="Comments" onClick={onComment} count={commentCount} showCount={showCounts}>
        <MessageCircle size={20} strokeWidth={2.2} aria-hidden="true" />
      </ActionButton>

      <ActionButton label="Views" onClick={onViews} count={viewCount} showCount={showCounts}>
        <Users size={20} strokeWidth={2.2} aria-hidden="true" />
      </ActionButton>

      <ActionButton label="Share" onClick={onShare} count={shareCount} showCount={showCounts}>
        <Forward size={20} strokeWidth={2.2} aria-hidden="true" />
      </ActionButton>

      <ActionButton
        label={bookmarked ? "Remove bookmark" : "Bookmark"}
        onClick={onBookmark}
        active={bookmarked}
        pressed={bookmarked}
      >
        <Bookmark
          size={20}
          strokeWidth={2.1}
          className={bookmarked ? "fill-current" : ""}
          aria-hidden="true"
        />
      </ActionButton>
    </div>
  );
}