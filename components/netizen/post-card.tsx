"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Avatar } from "./app-shell";
import { ShareModal } from "./share-modal";
import { PostActionBar } from "./post-action-bar";
import { PostImageGrid } from "./post-image-grid";
import type { FeedPost } from "./feed";

// reactions = { [userId]: emoji }
type PostWithReactions = FeedPost & { reactions?: Record<string, string> | null };

const reactionOptions = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "🥰", label: "Care" },
  { emoji: "😆", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😡", label: "Angry" },
] as const;

// A plain "like" (heart button) counts as this emoji when there is no specific reaction saved
const DEFAULT_LIKE_EMOJI = reactionOptions[1].emoji;

function formatRelativeTime(value?: string | Date) {
  if (!value) return "Just now";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

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
  onReshare,
  onHighlight,
  isHighlighted,
  postHighlights,
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
  isHighlighted: boolean;
  sessionUserId: string | null;
  onOpenProfile?: (
    userId: string,
    userName?: string | null,
    userImage?: string | null
  ) => void;
  onSelectPost: (post: FeedPost) => void;
  onLike: (post: FeedPost) => void;
  onComment: (post: FeedPost) => void;
  onShare: (post: FeedPost) => void;
  onReshare: (post: FeedPost) => void;
  onHighlight: (post: FeedPost) => void;
  onCommentDraftChange: (
    postId: string,
    value: string
  ) => void;
  commentDraft: string;
  commenting: boolean;
  onToggleCommenting: (postId: string) => void;
  postLikes: Record<
    string,
    { likes: number; hasLiked: boolean }
  >;
  postHighlights: Record<
    string,
    { highlightCount: number; highlighted: boolean }
  >;
  onHandleComment: (post: FeedPost) => void;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const highlightState = postHighlights[postId];
  const [highlighted, setHighlighted] = useState(highlightState?.highlighted ?? isHighlighted);

  const savedReactions = (post as PostWithReactions).reactions;
  const [reactionMap, setReactionMap] = useState<Record<string, string>>(
    () => (savedReactions && typeof savedReactions === "object" ? { ...savedReactions } : {})
  );

  // Pick up fresh data when the feed reloads
  useEffect(() => {
    setReactionMap(
      savedReactions && typeof savedReactions === "object" ? { ...savedReactions } : {}
    );
  }, [savedReactions]);

  const myReaction = sessionUserId ? reactionMap[sessionUserId] ?? null : null;
  const reactionCountDisplay = Math.max(0, Object.keys(reactionMap).length);
  const hasReaction = Boolean(myReaction);
  // highlights: derived from highlightedBy array (keeps userIds for ranking) + optimistic highlightState
  const highlightCount = Math.max(0, Math.floor(Number(highlightState?.highlightCount ?? post.highlightCount ?? (Array.isArray((post as any).highlightedBy) ? (post as any).highlightedBy.length : Array.isArray((post as any).likedBy) ? (post as any).likedBy.length : 0)) || 0));
  const highlightedByUser = highlightState?.highlighted ?? isHighlighted;
  const currentLikes = postLikes[postId]?.likes ?? post.likes ?? 0;
  const likedByUser = postLikes[postId]?.hasLiked ?? isLiked;
  const openedCount = Array.isArray(post.opened) ? post.opened.length : 0;

  // Most used reaction on this post
  const topReaction = useMemo(() => {
    const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
    const userIds = new Set([...likedBy, ...Object.keys(reactionMap)]);
    const tally = new Map<string, number>();

    userIds.forEach((id) => {
      const emoji = reactionMap[id] ?? (likedBy.includes(id) ? DEFAULT_LIKE_EMOJI : null);
      if (emoji) tally.set(emoji, (tally.get(emoji) ?? 0) + 1);
    });

    let best: string | null = null;
    let bestCount = 0;

    // Iterating in picker order makes ties deterministic
    for (const { emoji } of reactionOptions) {
      const count = tally.get(emoji) ?? 0;
      if (count > bestCount) {
        best = emoji;
        bestCount = count;
      }
    }

    return best;
  }, [post.likedBy, reactionMap]);

  const handleHighlight = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/highlight`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ highlighted: !highlightedByUser }),
      });
      const data = await response.json();
      if (data?.highlighted !== undefined) {
        setHighlighted(data.highlighted);
        onHighlight(post);
      }
    } catch (err) {
      console.error("Highlight failed:", err);
    }
  };

  const handleReactionSelect = async (emoji: string) => {
    setShowReactions(false);
    if (!sessionUserId) return;

    const previous = reactionMap[sessionUserId] ?? null;
    const next = previous === emoji ? null : emoji; // tapping the same emoji removes it

    const apply = (value: string | null) =>
      setReactionMap((current) => {
        const copy = { ...current };
        if (value) copy[sessionUserId] = value;
        else delete copy[sessionUserId];
        return copy;
      });

    apply(next);

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", emoji }),
      });

      if (!response.ok) throw new Error("Reaction failed");
      const data = await response.json().catch(() => null);
      if (data?.reactions && typeof data.reactions === "object") setReactionMap({ ...(data.reactions as Record<string,string>) });
    } catch (error) {
      console.error("Failed to save reaction:", error);
      apply(previous);
    }
  };

  return (
    // Mobile: break out to the full screen width no matter how much padding the parent has
    <article className="overflow-hidden rounded-2xl border border-[#e5ece7] bg-white shadow-[0_1px_3px_rgba(18,45,30,0.04)] max-md:ml-[calc(50%_-_50vw)] max-md:w-screen max-md:max-w-none max-md:rounded-none max-md:border-x-0 max-md:shadow-none">

      {/* Reshare indicator */}
      {post.reshareOf && post.reshareData && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-[#f0f8f3] px-3 py-2 text-xs text-[#64776b] sm:mx-4">
          <svg
            className="h-4 w-4 shrink-0 text-[#168b45]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 014-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 01-4 4H3" />
          </svg>

          <button
            type="button"
            onClick={() =>
              onSelectPost({
                ...post,
                id: post.reshareData?.originalPostId || post.reshareOf || post.id,
                _id: post.reshareData?.originalPostId || post.reshareOf || post._id,
                userId: post.reshareData?.originalUserId || post.userId,
                userName: post.reshareData?.originalUserName || post.userName,
                userImage: post.reshareData?.originalUserImage || null,
                content: post.reshareData?.originalContent || "",
                images: post.reshareData?.originalImages || [],
                reshareOf: null,
                reshareData: null,
              })
            }
            className="min-w-0 truncate text-left hover:underline"
            aria-label="Open the original post"
          >
            <b className="text-[#168b45]">{post.userName || "Someone"}</b>{" "}
            reshared a post from{" "}
            <b className="text-[#168b45]">
              {post.reshareData.originalUserName || "another user"}
            </b>
            <span className="ml-1" aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {/* Keep reshared posts focused on the reshare context and original post. */}
      {!post.reshareOf && (
        <div className="flex items-center gap-3 px-3 pb-1 pt-4 sm:px-4">
          <button
            type="button"
            className="shrink-0 rounded-full"
            onClick={() =>
              onOpenProfile?.(
                String(post.userId ?? ""),
                post.userName ?? "",
                post.userImage ?? ""
              )
            }
            aria-label={`Open ${post.userName || "user"} profile`}
          >
            <Avatar src={post.userImage} alt={post.userName || "User"} />
          </button>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() =>
                onOpenProfile?.(
                  String(post.userId ?? ""),
                  post.userName ?? "",
                  post.userImage ?? ""
                )
              }
              className="block max-w-full truncate text-left"
            >
              <b className="block truncate text-[15px] font-semibold text-[#17251e] sm:text-base">
                {post.userName || "Unknown user"}
              </b>

              <span className="mt-0.5 block truncate text-[13px] text-[#647994] sm:text-sm">
                @{(post.userName || "user").toLowerCase().replace(/\s+/g, ".")} {" "}
                · {formatRelativeTime(post.createdAt)}
              </span>
            </button>
          </div>

          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#647994] transition hover:bg-[#f0f8f3]"
            aria-label="Post options"
          >
            <MoreHorizontal size={22} />
          </button>
        </div>
      )}

      {/* Original post content nested inside a reshare */}
      {post.reshareOf && post.reshareData ? (
        <div className="mx-3 mb-2 mt-3 rounded-xl border border-[#e5ece7] bg-[#fafdfb] p-3 sm:mx-4 sm:p-4">
          <button
            type="button"
            onClick={() =>
              onOpenProfile?.(
                String(post.reshareData?.originalUserId ?? ""),
                post.reshareData?.originalUserName ?? "",
                post.reshareData?.originalUserImage ?? null
              )
            }
            className="mb-3 flex w-full items-center gap-2.5 text-left"
            aria-label={`Open ${post.reshareData.originalUserName || "original author"} profile`}
          >
            <Avatar
              src={post.reshareData.originalUserImage}
              alt={post.reshareData.originalUserName || "Original author"}
              size="sm"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-[#17251e]">
                {post.reshareData.originalUserName || "Unknown user"}
              </span>
              <span className="block truncate text-[12px] text-[#647994]">
                @{(post.reshareData.originalUserName || "user").toLowerCase().replace(/\s+/g, ".")} · original post
              </span>
            </span>
          </button>

          <p className="whitespace-pre-wrap break-words text-[14px] leading-6 text-[#1d2c23]">
            {post.reshareData.originalContent || ""}
          </p>

          {Array.isArray(post.reshareData.originalImages) && post.reshareData.originalImages.length > 0 && (
            <div className="mt-3">
              <PostImageGrid images={post.reshareData.originalImages} onImageClick={() => onSelectPost(post)} />
            </div>
          )}
        </div>
      ) : (
        post.content && (
          <button
            onClick={() => onSelectPost(post)}
            className="mt-2 block w-full cursor-pointer px-3 text-left transition hover:opacity-80 sm:px-4"
            type="button"
          >
            <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.55] text-[#1d2c23]">
              {post.content}
            </p>
          </button>
        )
      )}

      {/* Facebook-style media grid with an accessible lightbox */}
      {imageList.length > 0 && !post.reshareOf && (
        <div className="mt-3 sm:mx-4 sm:mb-1">
          <PostImageGrid
            images={imageList}
            onImageClick={() => onSelectPost(post)}
          />
        </div>
      )}

      {/* Reaction and comment summary */}
      <div className="mx-3 mt-3 flex items-center justify-between gap-2 border-b border-[#edf2ee] pb-2.5 text-xs text-[#718078] sm:mx-4">
        <span className="flex items-center gap-1.5">
          {topReaction && <span className="text-sm leading-none" aria-hidden="true">{topReaction}</span>}
          {reactionCountDisplay > 0 && <span>{reactionCountDisplay} {reactionCountDisplay === 1 ? "reaction" : "reactions"}</span>}
        </span>

        <button
          type="button"
          onClick={() => onSelectPost(post)}
          className="truncate text-right transition hover:text-[#168b45]"
        >
          {Number(post.comments ?? 0) > 0 && `${Number(post.comments ?? 0)} comments`}
          {Number(post.comments ?? 0) > 0 && Number(post.shares ?? 0) > 0 && " · "}
          {Number(post.shares ?? 0) > 0 && `${Number(post.shares ?? 0)} shares`}
        </button>
      </div>

      {/* Compact action bar */}
      <div className="px-3 py-2 sm:px-4">
        <PostActionBar
          highlighted={highlightedByUser}
          highlightCount={highlightCount}
          commentCount={Math.max(0, Number(post.comments ?? 0))}
          viewCount={openedCount}
          onViews={() => onSelectPost(post)}
          onHighlight={handleHighlight}
          onLongPressHighlight={() => setShowReactions(true)}
          onTrack={() => onSelectPost(post)}
          onComment={() => {
            onComment(post);
            onToggleCommenting(postId);
          }}
          onShare={() => setShareModalOpen(true)}
          showCounts={true}
        />
      </div>

      {/* Reaction picker */}
      {showReactions && (
        <div className="mx-3 mb-2 flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl border border-[#dcebe1] bg-white p-2 shadow-[0_6px_20px_rgba(15,39,28,0.10)] sm:mx-4">
          {reactionOptions.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() =>
                handleReactionSelect(option.emoji)
              }
              className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:scale-110 hover:bg-[#eef8f1] ${
                myReaction === option.emoji ? "bg-[#e3f4e9]" : ""
              }`}
              aria-label={option.label}
              title={option.label}
            >
              {option.emoji}
            </button>
          ))}
        </div>
      )}

      {/* Share modal */}
      <ShareModal
        post={post}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onReshare={onReshare}
        sessionUserId={sessionUserId}
      />

      {/* Top reaction + discussion link */}
      <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-1 sm:px-4">
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-[#718078]">
          {topReaction && (
            <>
              <span className="text-base leading-none">{topReaction}</span>
              <span>top reaction</span>
              {myReaction && (
                <span className="text-[#9aa79f]">· you {myReaction}</span>
              )}
            </>
          )}
        </span>

        <button
          onClick={() => onSelectPost(post)}
          className="shrink-0 text-xs font-semibold text-[#168b45] transition hover:text-[#0c6831]"
          type="button"
        >
          Open discussion
        </button>
      </div>

      {/* Comment composer */}
      {commenting && (
        <div className="mx-3 mb-3 mt-2 rounded-xl border border-[#e5ece7] bg-[#f7faf7] p-3 sm:mx-4">
          <textarea
            value={commentDraft}
            onChange={(event) =>
              onCommentDraftChange(
                postId,
                event.target.value
              )
            }
            rows={3}
            placeholder="Write a comment..."
            className="w-full resize-y rounded-lg border border-[#dfe9df] bg-white px-3 py-2 text-sm text-[#1d2c23] outline-none transition placeholder:text-[#87948b] focus:border-[#76b99a] focus:ring-2 focus:ring-[#168b45]/10"
          />

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-full border border-[#dfe9df] px-3 py-1.5 text-sm text-[#52665a] transition hover:bg-white"
              onClick={() =>
                onToggleCommenting(postId)
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="rounded-full bg-[#168b45] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#116f37]"
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
