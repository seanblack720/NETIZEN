"use client";

import { Forward, MessageCircle, Sparkles, Target, Users } from "lucide-react";

type PostActionBarProps = {
  highlighted?: boolean;
  highlightCount?: number;
  commentCount?: number;
  shareCount?: number;
  onHighlight?: () => void;
  onLongPressHighlight?: () => void;
  viewCount?: number;
  onViews?: () => void;
  onTrack?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  showCounts?: boolean;
};

function ActionButton({ label, onClick, count, children }: { label: string; onClick?: () => void; count?: number; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-full text-[#1f6b4a] transition active:scale-95 active:bg-[#d3ebdf]">
      {children}
      {typeof count === "number" && count > 0 && <span className="text-xs font-semibold tabular-nums">{count}</span>}
    </button>
  );
}

export function PostActionBar({ highlighted = false, highlightCount, commentCount, viewCount, shareCount, onHighlight, onLongPressHighlight, onViews, onTrack, onComment, onShare, showCounts = false }: PostActionBarProps) {
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  const startPress = () => { pressTimer = setTimeout(() => { onLongPressHighlight?.(); pressTimer = undefined; }, 480); };
  const endPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = undefined; } };

  return (
    <div className="flex w-full items-center gap-1 rounded-full bg-[#e8f5ee] p-1.5">
      <button type="button" onClick={onHighlight} onPointerDown={startPress} onPointerUp={endPress} onPointerCancel={endPress} onPointerLeave={endPress} aria-label={highlighted ? "Highlighted" : "Highlight"} className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-white transition active:scale-95 ${highlighted ? "bg-[#168b45]" : "bg-[#1c9d57]"}`}>
        <Sparkles aria-hidden="true" className={highlighted ? "text-amber-300" : ""} />
        <span className="text-sm font-semibold">{highlighted ? "Highlighted" : "Highlight"}</span>
        {showCounts && typeof highlightCount === "number" && highlightCount > 0 && <span className="text-xs tabular-nums">{highlightCount}</span>}
      </button>

      <ActionButton label="Comments" onClick={onComment} count={showCounts ? commentCount : undefined}><MessageCircle strokeWidth={2.2} /></ActionButton>
      <ActionButton label="Post views" onClick={onViews} count={showCounts ? viewCount : undefined}><Users strokeWidth={2.2} /></ActionButton>
      <ActionButton label="Track notifications" onClick={onTrack}><Target strokeWidth={2.2} /></ActionButton>
      <ActionButton label="Share" onClick={onShare} count={showCounts ? shareCount : undefined}><Forward strokeWidth={2.2} /></ActionButton>
    </div>
  );
}
