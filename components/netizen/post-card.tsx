"use client";

import { Heart, MessageCircle, MoreHorizontal, Plus, Send } from "lucide-react";
import { useState } from "react";

import { Avatar } from "./app-shell";
import type { FeedPost } from "./feed";

const reactionOptions = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "🥰", label: "Care" },
  { emoji: "😆", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😡", label: "Angry" },
] as const;

function formatRelativeTime(value?: string | Date) {
  if (!value) return "Just now";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hr`;
  }

  const diffDays = Math.round(diffHours / 24);

  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

export function PostCard({
  post,
  postId,
  imageList,
  isLiked,
  sessionUserId,
  onOpenProfile,
  onSelectPost,
  onLike,
  onComment,
  onShare,
  onCommentDraftChange,
  commentDraft,
  commenting,
  onToggleCommenting,
  postLikes,
  onHandleComment,
}: {
  post: FeedPost;
  postId: string;
  imageList: string[];
  isLiked: boolean;
  sessionUserId: string | null;
  onOpenProfile?: (userId: string, userName?: string | null, userImage?: string | null) => void;
  onSelectPost: (post: FeedPost) => void;
  onLike: (post: FeedPost) => void;
  onComment: (post: FeedPost) => void;
  onShare: (post: FeedPost) => void;
  onCommentDraftChange: (postId: string, value: string) => void;
  commentDraft: string;
  commenting: boolean;
  onToggleCommenting: (postId: string) => void;
  postLikes: Record<string, { likes: number; hasLiked: boolean }>;
  onHandleComment: (post: FeedPost) => void;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  const currentLikes = postLikes[postId]?.likes ?? post.likes ?? 0;
  const likedByUser = postLikes[postId]?.hasLiked ?? isLiked;

  const handleReactionSelect = (emoji: string) => {
    setSelectedReaction(emoji);
    setShowReactions(false);
  };

  return (
    <article className="rounded-[18px] border border-[#e5ece7] bg-white p-5 shadow-[0_1px_2px_rgba(18,45,30,0.03)] max-md:-mx-[15px] max-md:rounded-none max-md:border-x-0 max-md:shadow-none">
      <div className="flex items-center gap-3">
        <Avatar src={post.userImage || "/avatar-1.png"} alt={post.userName || "User"} />
        <div>
          <button
            type="button"
            onClick={() => onOpenProfile?.(String(post.userId ?? ""), post.userName ?? "", post.userImage ?? "")}
            className="block text-left"
          >
            <b className="block text-left text-base">{post.userName || "Unknown user"}</b>
            <span className="mt-1 block text-sm text-slate-500">
              @{(post.userName || "user").toLowerCase().replace(/\s+/g, ".")} · {formatRelativeTime(post.createdAt)}
            </span>
          </button>
        </div>
        <MoreHorizontal className="ml-auto text-slate-500" />
      </div>

      <button
        onClick={() => onSelectPost(post)}
        className="mt-3 block w-full cursor-pointer text-left transition hover:opacity-80"
        type="button"
      >
        <p className="whitespace-pre-wrap text-[15px] leading-6 text-[#1d2c23] hover:text-[#1f4d38]">{post.content || ""}</p>
      </button>

      {imageList.length > 0 && (
        <button
          onClick={() => onSelectPost(post)}
          className="mt-4 block w-full cursor-pointer overflow-hidden rounded-2xl border border-[#edf2ee] bg-[#f5f7f5] transition hover:opacity-95 max-md:-mx-5 max-md:w-[calc(100%+40px)] max-md:rounded-none max-md:border-x-0"
          type="button"
        >
          {imageList.length === 1 ? (
            <img src={imageList[0]} alt="Post" className="h-[360px] w-full object-cover max-md:h-[440px]" />
          ) : (
            <div className="grid h-[360px] grid-cols-[0.72fr_1.28fr] gap-1 bg-white max-md:h-[440px]">
              <div className={`grid gap-1 ${imageList.length === 2 ? "grid-rows-1" : "grid-rows-2"}`}>
                {imageList.slice(1, 3).map((image, index) => (
                  <div key={`${postId}-image-${index + 1}`} className="relative min-h-0 overflow-hidden">
                    <img src={image} alt={`Post ${index + 2}`} className="h-full w-full object-cover" />
                    {index === 1 && imageList.length > 3 && (
                      <span className="absolute inset-0 grid place-items-center bg-black/45 text-2xl font-semibold text-white">
                        +{imageList.length - 3}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="relative min-h-0 overflow-hidden">
                <img src={imageList[0]} alt="Post cover" className="h-full w-full object-cover" />
                <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
                  1 / {imageList.length}
                </span>
              </div>
            </div>
          )}
        </button>
      )}

      <div className="mt-4 flex items-center justify-between border-b border-[#edf2ee] pb-2.5 text-xs text-[#6b7b73]">
        <span>{currentLikes} reactions</span>
        <button type="button" onClick={() => onSelectPost(post)} className="hover:text-[#1c9d57]">
          {post.comments ?? 0} comments · {post.shares ?? 0} shares
        </button>
      </div>

      <div className="grid grid-cols-[auto,1fr,1fr,1fr] gap-1 pt-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowReactions((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe9df] bg-[#f3f7f4] text-[#1c9d57] transition hover:bg-[#eaf6ee]"
            aria-label="React to post"
            title="Add reaction"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>

          {showReactions && (
            <div className="absolute bottom-12 left-0 z-20 flex gap-2 rounded-full border border-[#e4ecdf] bg-white p-2 shadow-[0_10px_30px_rgba(15,39,28,0.12)]">
              {reactionOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleReactionSelect(option.emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:scale-110 hover:bg-[#f2f7f3]"
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
          className={`flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
            likedByUser ? "bg-[#fff1f3] text-[#df4059]" : "text-[#5f7073] hover:bg-[#f1f6f2]"
          }`}
          onClick={() => onLike(post)}
          type="button"
        >
          <Heart className={`h-[18px] w-[18px] ${likedByUser ? "fill-current" : ""}`} />
          <span>{selectedReaction ?? "Like"}</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleCommenting(postId)}
          className="flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[#5f7073] transition hover:bg-[#f1f6f2]"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
          Comment
        </button>

        <button
          type="button"
          onClick={() => onShare(post)}
          className="flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[#5f7073] transition hover:bg-[#f1f6f2]"
        >
          <Send className="h-[18px] w-[18px]" />
          Share
        </button>
      </div>

      {(selectedReaction || sessionUserId) && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-[#5f7073]">
            {selectedReaction ? `You reacted with ${selectedReaction}` : "Tap the + button to react"}
          </span>
          <button onClick={() => onSelectPost(post)} className="text-xs font-semibold text-[#168b45] hover:text-[#0c6831]" type="button">
            Open discussion
          </button>
        </div>
      )}

      {commenting && (
        <div className="mt-3 rounded-2xl border border-[#edf2ee] bg-[#f7faf7] p-3">
          <textarea
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(postId, event.target.value)}
            rows={3}
            placeholder="Write a comment..."
            className="w-full rounded-xl border border-[#dfe9df] bg-white px-3 py-2 text-sm text-[#111827] outline-none ring-0 placeholder:text-[#7b867d]"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-full border border-[#dfe9df] px-3 py-1.5 text-sm text-[#1d2c23]"
              onClick={() => onToggleCommenting(postId)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white"
              onClick={() => onHandleComment(post)}
            >
              Comment
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
