"use client";

import { Forward, MessageCircle, Plus, Star, Users } from "lucide-react";

type PostActionBarProps = {
  highlighted?: boolean;
  highlightCount?: number;
  commentCount?: number;
  viewCount?: number;
  shareCount?: number;
  onAdd?: () => void;
  onHighlight?: () => void;
  onComment?: () => void;
  onViews?: () => void;
  onShare?: () => void;
  /** Show small numbers next to each icon */
  showCounts?: boolean;
};

function ActionButton({
  label,
  onClick,
  count,
  showCount,
  children,
}: {
  label: string;
  onClick?: () => void;
  count?: number;
  showCount?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 flex-1 items-center justify-center gap-1 rounded-full text-[#1f6b4a] transition active:scale-95 active:bg-[#d3ebdf]"
    >
      {children}
      {showCount && typeof count === "number" && (
        <span className="text-xs font-semibold tabular-nums">{Math.max(0, count)}</span>
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
  onAdd,
  onHighlight,
  onComment,
  onViews,
  onShare,
  showCounts = false,
}: PostActionBarProps) {
  return (
    <div className="flex w-full items-center gap-0.5 rounded-full bg-[#e8f5ee] p-1.5">
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add reaction"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#76b69a] text-white transition active:scale-90"
      >
        <Plus className="h-5 w-5" strokeWidth={2.6} />
      </button>

      <ActionButton label={highlighted ? "Unhighlight" : "Highlight"} onClick={onHighlight} count={highlightCount} showCount={showCounts}>
        <Star className={`h-[22px] w-[22px] ${highlighted ? "fill-amber-500 text-amber-500" : ""}`} strokeWidth={2.2} />
      </ActionButton>

      <ActionButton label="Comments" onClick={onComment} count={commentCount} showCount={showCounts}>
        <MessageCircle className="h-[22px] w-[22px]" strokeWidth={2.2} />
      </ActionButton>

      <ActionButton label="Views" onClick={onViews} count={viewCount} showCount={showCounts}>
        <Users className="h-[22px] w-[22px]" strokeWidth={2.2} />
      </ActionButton>

      <ActionButton label="Share" onClick={onShare} count={shareCount} showCount={showCounts && !!shareCount}>
        <Forward className="h-[22px] w-[22px]" strokeWidth={2.2} />
      </ActionButton>
    </div>
  );
}