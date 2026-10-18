"use client";

import { Heart, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [activeReactionMenuId, setActiveReactionMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveReactionMenuId(null);
    }
  }, [isOpen]);

  if (!isOpen || !comment) return null;

  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-[#f4f7f5]">
      <div className="relative z-30 flex shrink-0 items-center gap-3 border-b border-[#e3ebe6] bg-white px-5 py-4 md:px-6">
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#1a2c22] transition hover:bg-[#f2f6f3]"
          aria-label="Close replies"
        >
          <X size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#15271d]">
            Replies to {comment.userName || "this user"}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-24">
        <div className="bg-white px-5 py-5 md:px-6">
          <div className="space-y-3">
            {Array.isArray(comment.replies) && comment.replies.length > 0 ? (
              comment.replies.map((reply) => {
                const isReplyLiked =
                  !!sessionUserId &&
                  Array.isArray(reply.likedBy) &&
                  reply.likedBy.includes(sessionUserId);

                return (
                  <div
                    key={String(reply._id ?? `${comment._id ?? "reply"}-reply`)}
                    className="rounded-xl bg-[#f5f7f5] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dff1e5] text-xs font-semibold text-[#176b3a]">
                        {reply.userImage ? (
                          <img
                            src={reply.userImage}
                            alt={reply.userName || "User"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (reply.userName || "User")
                            .trim()
                            .split(/\\s+/)
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#15271d]">
                          {reply.userName || "User"}
                        </p>
                        <p className="text-xs text-[#9aa79f]">
                          {reply.createdAt
                            ? new Date(reply.createdAt).toLocaleString()
                            : "Just now"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-2 text-sm leading-5 text-[#15271d]">
                      {reply.replyTo?.userName ? (
                        <span className="font-semibold text-[#1c9d57]">
                          @{reply.replyTo.userName}{" "}
                        </span>
                      ) : null}
                      {reply.content}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#5b6b62]">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveReactionMenuId(
                              activeReactionMenuId === String(reply._id) ? null : String(reply._id)
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dfe9df] bg-white text-[#1c9d57] transition hover:bg-[#eaf6ee]"
                          aria-label="Add reply reaction"
                        >
                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                        </button>

                        {activeReactionMenuId === String(reply._id) && (
                          <div className="absolute bottom-10 left-0 z-20 flex gap-2 rounded-full border border-[#e4ecdf] bg-white p-2 shadow-[0_10px_30px_rgba(15,39,28,0.12)]">
                            {reactionOptions.map((option) => (
                              <button
                                key={option.label}
                                type="button"
                                onClick={() => {
                                  setActiveReactionMenuId(null);
                                  if (reply._id) {
                                    const nextText = replyText.trim();
                                    const nextValue = nextText
                                      ? `${nextText} ${option.emoji}`
                                      : `${option.emoji}`;
                                    setReplyText(nextValue);
                                  }
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:scale-110 hover:bg-[#f2f7f3]"
                                aria-label={option.label}
                                title={option.label}
                              >
                                {option.emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => reply._id && onLikeReply(reply._id)}
                        className={`flex items-center gap-1 rounded-full px-2 py-1 font-medium ${
                          isReplyLiked ? "bg-[#fff1f3] text-[#df4059]" : "bg-white text-[#5b6b62]"
                        }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isReplyLiked ? "fill-current" : ""}`} />
                        {Number(reply.likes ?? 0)} likes
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          reply.userName && onReplyToUser(reply.userName)
                        }
                        className="rounded-full bg-white px-2 py-1 font-medium text-[#1c9d57]"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-4 text-sm text-[#9aa79f]">No replies yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dfe9e2] bg-white/95 px-3 py-3 backdrop-blur-md md:px-6">
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
            <div className="flex items-center rounded-2xl border border-[#dce8df] bg-[#eef7f2] px-3 py-2 text-xs font-medium text-[#1c9d57]">
              @ {replyingToUserName}
            </div>
          ) : null}

          <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-[#dce8df] bg-[#f7faf8] px-4 focus-within:border-[#1c9d57] focus-within:ring-2 focus-within:ring-[#1c9d57]/20">
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
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#15271d] outline-none placeholder:text-[#9aa79f]"
              disabled={!sessionUserId}
            />
          </div>

          <button
            type="submit"
            disabled={!replyText.trim() || !sessionUserId}
            className="shrink-0 rounded-2xl bg-[#1c9d57] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#138647] disabled:cursor-not-allowed disabled:bg-[#9aa79f]"
          >
            Reply
          </button>
        </form>
      </div>
    </div>
  );
}
