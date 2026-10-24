"use client";

import { Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PostMenu, VerifiedBadge, n } from "./post-extras";

type ReplyItem = {
  _id?: string;
  userId?: string;
  userName?: string;
  userImage?: string | null;
  content: string;
  createdAt?: string | Date;
  likes?: number;
  likedBy?: string[];
  replyTo?: { userName?: string } | null;
};

type CommentItem = {
  _id?: string;
  userId?: string;
  userName?: string;
  userImage?: string | null;
  content: string;
  createdAt?: string | Date;
  replies?: ReplyItem[];
};

const reactionOptions = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "🥰", label: "Care" },
  { emoji: "😆", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😡", label: "Angry" },
] as const;

/* Same theme tokens as the post page, so both screens match */
const ui = {
  page: "bg-white dark:bg-[#101a17]",
  text: "text-[#15271d] dark:text-[#e6ece9]",
  muted: "text-[#718078] dark:text-[#9bb0a8]",
  border: "border-[#e3ebe6] dark:border-[#1e3a2f]",
  bubble: "bg-[#f0f2f1] dark:bg-[#24382f]",
  hover: "hover:bg-[#f2f6f3] dark:hover:bg-[#1f332b]",
  accent: "text-[#168b45] dark:text-[#7ee0b0]",
  panel: "border-[#dcebe1] bg-white dark:border-[#1e3a2f] dark:bg-[#18231f]",
};

function formatRelativeTime(value?: string | Date) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMinutes = Math.max(
    1,
    Math.round((Date.now() - date.getTime()) / 60000)
  );
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

function initialsOf(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* Round avatar: the picture, or the initials when there is none / it fails to load */
function Face({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt?: string | null;
  className: string;
}) {
  const [errored, setErrored] = useState(false);
  const ok = !!src && typeof src === "string" && src.trim().length > 0 && !errored;

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#e8efe8] text-xs font-semibold text-[#2f6b4f] dark:bg-[#24382f] dark:text-[#7ee0b0] ${className}`}
    >
      {ok ? (
        <img
          src={String(src)}
          alt={alt || "User"}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span className="leading-none">{initialsOf(alt)}</span>
      )}
    </div>
  );
}

/* =========================================================
   ONE REPLY
   Like button: tap = like / unlike, long press = emoji picker
========================================================== */
function ReplyRow({
  reply,
  sessionUserId,
  onLikeReply,
  onReplyToUser,
}: {
  reply: ReplyItem;
  sessionUserId: string | null;
  onLikeReply: (replyId: string) => Promise<void> | void;
  onReplyToUser: (userName: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reaction, setReaction] = useState<{ emoji: string; label: string } | null>(null);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const clearTimer = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  useEffect(() => clearTimer, []);

  const startPress = () => {
    longPressed.current = false;
    clearTimer();
    holdTimer.current = setTimeout(() => {
      longPressed.current = true;
      setPickerOpen(true);
      try {
        navigator.vibrate?.(20);
      } catch {}
    }, 450);
  };

  const isLiked =
    !!sessionUserId &&
    Array.isArray(reply.likedBy) &&
    reply.likedBy.includes(sessionUserId);
  const active = isLiked || !!reaction;
  const likes = n(reply.likes);

  const handleLikeClick = () => {
    // the click that follows a long press must not also toggle the like
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (reaction) {
      setReaction(null);
      if (isLiked && reply._id) onLikeReply(reply._id);
      return;
    }
    if (reply._id) onLikeReply(reply._id);
  };

  const pickReaction = (option: { emoji: string; label: string }) => {
    setPickerOpen(false);
    setReaction(option);
    // an emoji reaction also counts as a like
    if (!isLiked && reply._id) onLikeReply(reply._id);
  };

  return (
    <div className="flex items-start gap-2">
      <Face src={reply.userImage} alt={reply.userName} className="h-8 w-8" />

      <div className="min-w-0 flex-1">
        {/* Bubble */}
        <div className="relative inline-block max-w-full">
          <div className={`rounded-2xl px-3 py-2 ${ui.bubble}`}>
            <p className={`flex items-center gap-1 text-[13px] font-semibold ${ui.text}`}>
              {reply.userName || "User"}
              <VerifiedBadge size={13} />
            </p>
            <p className={`whitespace-pre-wrap break-words text-[14px] leading-5 ${ui.text}`}>
              {reply.replyTo?.userName ? (
                <span className={`mr-1 font-semibold ${ui.accent}`}>
                  {reply.replyTo.userName}
                </span>
              ) : null}
              {reply.content}
            </p>
          </div>

          {(likes > 0 || reaction) && (
            <span
              className={`absolute -bottom-2.5 right-2 flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] shadow-sm ${ui.border} ${ui.page} ${ui.muted}`}
            >
              {reaction ? (
                <span className="text-xs leading-none">{reaction.emoji}</span>
              ) : (
                <Star size={11} className="fill-[#df4059] text-[#df4059]" />
              )}
              {likes > 0 && likes}
            </span>
          )}
        </div>

        {/* Time · Like (hold for emojis) · Reply · menu */}
        <div
          className={`relative flex items-center gap-4 px-3 text-xs font-semibold ${ui.muted} ${
            likes > 0 || reaction ? "mt-3" : "mt-1"
          }`}
        >
          <span className="font-normal">{formatRelativeTime(reply.createdAt)}</span>

          <button
            type="button"
            onPointerDown={startPress}
            onPointerUp={clearTimer}
            onPointerLeave={clearTimer}
            onPointerCancel={clearTimer}
            onContextMenu={(e) => e.preventDefault()}
            onClick={handleLikeClick}
            aria-label="Like (hold for reactions)"
            className={`select-none [-webkit-touch-callout:none] ${
              active ? "text-[#df4059]" : ""
            }`}
          >
            {reaction ? reaction.label : "Highlight"}
          </button>

          <button
            type="button"
            onClick={() => reply.userName && onReplyToUser(reply.userName)}
          >
            Reply
          </button>

          <span className="ml-auto">
            <PostMenu
              size={14}
              label="Reply options"
              buttonClassName="grid h-6 w-6 place-items-center rounded-full text-[#718078] transition hover:bg-[#f2f6f3] dark:text-[#9bb0a8] dark:hover:bg-[#1f332b]"
            />
          </span>

          {/* Emoji picker, opened by a long press on Like. Tapping anywhere else closes it. */}
          {pickerOpen && (
            <>
              <button
                type="button"
                aria-label="Close reactions"
                tabIndex={-1}
                onClick={() => setPickerOpen(false)}
                className="fixed inset-0 z-10 cursor-default bg-transparent"
              />
              <div
                className={`absolute bottom-full left-0 z-20 mb-2 flex items-center gap-1 rounded-full border p-1.5 shadow-[0_10px_30px_rgba(15,39,28,0.2)] ${ui.panel}`}
              >
                {reactionOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => pickReaction(option)}
                    aria-label={option.label}
                    title={option.label}
                    className={`grid h-9 w-9 place-items-center rounded-full text-[22px] leading-none transition hover:scale-125 active:scale-95 ${ui.hover} ${
                      reaction?.emoji === option.emoji
                        ? "bg-[#e3f4e9] dark:bg-[#143a26]"
                        : ""
                    }`}
                  >
                    {option.emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReplyModal({
  isOpen,
  comment,
  sessionUserId,
  onClose,
  onSubmit,
  onLikeReply,
  onReplyToUser,
  replyText,
  setReplyText,
  replyingToUserName,
}: {
  isOpen: boolean;
  comment: CommentItem | null;
  sessionUserId: string | null;
  onClose: () => void;
  onSubmit: (replyText: string) => Promise<void> | void;
  onLikeReply: (replyId: string) => Promise<void> | void;
  onReplyToUser: (userName: string) => void;
  replyText: string;
  setReplyText: (value: string) => void;
  replyingToUserName: string | null;
}) {
  if (!isOpen || !comment) return null;

  const replies = Array.isArray(comment.replies) ? comment.replies : [];
  const replyTotal = n(replies.length);

  return (
    <div className={`fixed inset-0 z-60 flex flex-col ${ui.page} ${ui.text}`}>
      {/* Header */}
      <div
        className={`relative z-30 flex shrink-0 items-center gap-3 border-b px-3 py-3 ${ui.border} ${ui.page}`}
      >
        <button
          type="button"
          onClick={onClose}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition ${ui.text} ${ui.hover}`}
          aria-label="Close replies"
        >
          <X size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold ${ui.text}`}>
            Replies to {comment.userName || "this user"}
          </p>
          {replyTotal > 0 && (
            <p className={`text-xs ${ui.muted}`}>
              {replyTotal} {replyTotal === 1 ? "reply" : "replies"}
            </p>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-24">
        {/* The comment being replied to */}
        <div className={`flex items-start gap-2 border-b px-3 py-4 ${ui.border} ${ui.page}`}>
          <Face src={comment.userImage} alt={comment.userName} className="h-9 w-9" />

          <div className="min-w-0 flex-1">
            <div className={`inline-block max-w-full rounded-2xl px-3 py-2 ${ui.bubble}`}>
              <p className={`flex items-center gap-1 text-[13px] font-semibold ${ui.text}`}>
                {comment.userName || "User"}
                <VerifiedBadge size={13} />
              </p>
              <p className={`whitespace-pre-wrap break-words text-[14px] leading-5 ${ui.text}`}>
                {comment.content}
              </p>
            </div>

            <p className={`mt-1 px-3 text-xs ${ui.muted}`}>
              {formatRelativeTime(comment.createdAt)}
            </p>
          </div>
        </div>

        {/* Replies, full width and slightly indented like a thread */}
        <div className={`flex-1 py-4 pl-12 pr-3 ${ui.page}`}>
          {replies.length > 0 ? (
            <div className="space-y-5">
              {replies.map((reply, index) => (
                <ReplyRow
                  key={String(reply._id ?? `${comment._id ?? "reply"}-${index}`)}
                  reply={reply}
                  sessionUserId={sessionUserId}
                  onLikeReply={onLikeReply}
                  onReplyToUser={onReplyToUser}
                />
              ))}
            </div>
          ) : (
            <p className={`py-4 text-sm ${ui.muted}`}>No replies yet</p>
          )}
        </div>
      </div>

      {/* Fixed reply input */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t px-3 py-3 backdrop-blur-md md:px-6 ${ui.border} bg-white/95 dark:bg-[#101a17]/95`}
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmed = replyText.trim();
            if (!trimmed || !comment._id || !sessionUserId) return;
            await onSubmit(trimmed);
          }}
          className="mx-auto flex w-full max-w-5xl items-center gap-2"
        >
          {replyingToUserName ? (
            <div
              className={`flex shrink-0 items-center rounded-full px-3 py-2 text-xs font-medium ${ui.bubble} ${ui.accent}`}
            >
              @ {replyingToUserName}
            </div>
          ) : null}

          <div
            className={`flex min-w-0 flex-1 items-center rounded-full px-4 focus-within:ring-2 focus-within:ring-[#1c9d57]/30 ${ui.bubble}`}
          >
            <input
              type="text"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder={
                sessionUserId
                  ? replyingToUserName
                    ? `Reply to @${replyingToUserName}...`
                    : "Write a reply..."
                  : "Sign in to reply..."
              }
              className={`min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#9aa79f] ${ui.text}`}
              disabled={!sessionUserId}
            />
          </div>

          <button
            type="submit"
            disabled={!replyText.trim() || !sessionUserId}
            className="shrink-0 rounded-full bg-[#1c9d57] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#138647] disabled:cursor-not-allowed disabled:bg-[#9aa79f] dark:disabled:bg-[#233d32]"
          >
            Reply
          </button>
        </form>
      </div>
    </div>
  );
}