"use client";

import { Heart } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Avatar } from "./app-shell";
import { ShareModal } from "./share-modal";
import { PostActionBar } from "./post-action-bar";
import { PostMenu, n } from "./post-extras";
import { AuthorBadge, PostFollowButtons, proHint } from "./post-follow-buttons";
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

// Facebook-style image grid layouts, keyed by number of tiles shown (2-5)
const imageGridClass: Record<number, string> = {
  2: "grid-cols-2 grid-rows-1 h-[260px] sm:h-[340px]",
  3: "grid-cols-2 grid-rows-[3fr_2fr] h-[360px] sm:h-[420px]",
  4: "grid-cols-2 grid-rows-2 h-[340px] sm:h-[420px]",
  5: "grid-cols-6 grid-rows-2 h-[340px] sm:h-[420px]",
};

// Column span per tile, by total number of tiles shown
const imageTileSpan: Record<number, string[]> = {
  2: ["", ""],
  3: ["col-span-2", "", ""],
  4: ["", "", "", ""],
  5: ["col-span-3", "col-span-3", "col-span-2", "col-span-2", "col-span-2"],
};

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

function initialsOf(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* Small round avatar used by the top comment preview */
function MiniFace({ src, name }: { src?: string | null; name?: string | null }) {
  const [errored, setErrored] = useState(false);
  const ok = !!src && src.trim().length > 0 && !errored;

  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e8efe8] text-[11px] font-semibold text-[#2f6b4f] dark:bg-[#24382f] dark:text-[#7ee0b0]">
      {ok ? (
        <img
          src={String(src)}
          alt={name || "User"}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
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
  bookmarkedIds,
  onBookmark,
  hideFollow,
  menuSlot,
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
  onCommentDraftChange: (postId: string, value: string) => void;
  commentDraft: string;
  commenting: boolean;
  onToggleCommenting: (postId: string) => void;
  postLikes: Record<string, { likes: number; hasLiked: boolean }>;
  postHighlights: Record<string, { highlightCount: number; highlighted: boolean }>;
  onHandleComment: (post: FeedPost) => void;
  bookmarkedIds?: Set<string>;
  onBookmark?: (post: FeedPost) => void;
  /** hide the Follow / Add buttons (used on profile pages) */
  hideFollow?: boolean;
  /** replaces the 3-dot menu (used for edit / delete on your own posts) */
  menuSlot?: ReactNode;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const highlightState = postHighlights[postId];
  const pickerRef = useRef<HTMLDivElement>(null);

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

  // Close emoji picker when tapping anywhere outside it (requirement)
  useEffect(() => {
    if (!showReactions) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (pickerRef.current && target && !pickerRef.current.contains(target)) {
        setShowReactions(false);
      }
    };
    // slight delay to avoid immediate close from the long-press opening event
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("touchstart", handleOutside as any, { passive: true } as any);
      document.addEventListener("click", handleOutside as any);
    }, 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside as any);
      document.removeEventListener("click", handleOutside as any);
    };
  }, [showReactions]);

  const myReaction = sessionUserId ? reactionMap[sessionUserId] ?? null : null;
  const reactionCountDisplay = n(Object.keys(reactionMap).length);
  const hasReaction = Boolean(myReaction);
  // highlights: derived from highlightedBy array (keeps userIds for ranking) + optimistic highlightState
  const highlightCount = n(
    highlightState?.highlightCount ??
      post.highlightCount ??
      (Array.isArray((post as any).highlightedBy)
        ? (post as any).highlightedBy.length
        : Array.isArray((post as any).likedBy)
          ? (post as any).likedBy.length
          : 0)
  );
  const highlightedByUser = highlightState?.highlighted ?? isHighlighted;
  const isBookmarked = bookmarkedIds ? bookmarkedIds.has(postId) : false;
  const currentLikes = n(postLikes[postId]?.likes ?? post.likes ?? 0);
  const likedByUser = postLikes[postId]?.hasLiked ?? isLiked;
  const openedCount = n(Array.isArray(post.opened) ? post.opened.length : 0);
  const commentsCount = n(post.comments);
  const sharesCount = n(post.shares);

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

  // Most liked comment (earliest one wins a tie)
  const topComment = useMemo(() => {
    const list: any[] = Array.isArray((post as any).commentsList)
      ? (post as any).commentsList
      : [];
    if (list.length === 0) return null;

    const likesOf = (c: any) =>
      n(c?.likes ?? (Array.isArray(c?.likedBy) ? c.likedBy.length : 0));

    let best = list[0];
    let bestLikes = likesOf(best);

    for (const comment of list) {
      const likes = likesOf(comment);
      if (likes > bestLikes) {
        best = comment;
        bestLikes = likes;
      }
    }

    return { comment: best, likes: bestLikes };
  }, [post]);

  const handleHighlight = () => {
    // Single source of truth – delegate to feed which does optimistic + DB PATCH
    onHighlight(post);
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

  const openProfile = () =>
    onOpenProfile?.(
      String(post.userId ?? ""),
      post.userName ?? "",
      post.userImage ?? ""
    );

  // total of highlights + emoji reactions, shown as plain text (no emojis, no hearts)
  const allReactions = highlightCount + reactionCountDisplay;
  const hasBodyText = post.reshareOf
    ? !!post.reshareData?.originalContent?.trim()
    : !!post.content?.trim();

  return (
    // Mobile: break out to the full screen width no matter how much padding the parent has
    <article className="overflow-hidden rounded-2xl  bg-white shadow-[0_1px_3px_rgba(18,45,30,0.04)] max-md:ml-[calc(50%_-_50vw)] max-md:w-screen max-md:max-w-none max-md:rounded-none max-md:border-x-0 max-md:shadow-none">
      {/* Post author */}
      <div className="flex items-center gap-3 px-3 pb-1 pt-4 sm:px-4">
        <button
          type="button"
          className="shrink-0 rounded-full"
          onClick={openProfile}
          aria-label={`Open ${post.userName || "user"} profile`}
        >
          <Avatar
            src={post.userImage || null}
            alt={post.userName || "User"}
          />
        </button>

        <div className="min-w-0 flex-1">
          {/* Name + Follow (blue) / Add netizen (sends a real request) */}
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={openProfile}
                className="min-w-0 truncate text-left"
              >
                <b className="block truncate text-[15px] font-semibold text-[#17251e] sm:text-base">
                  {post.userName || "Unknown user"}
                </b>
              </button>
              <AuthorBadge userId={post.userId} viewerId={sessionUserId} isPro={proHint(post)} />
            </div>

            {!hideFollow && (
              <PostFollowButtons userId={post.userId} viewerId={sessionUserId} isPro={proHint(post)} />
            )}
          </div>

          <button
            type="button"
            onClick={openProfile}
            className="mt-0.5 block max-w-full truncate text-left"
          >
            <span className="block truncate text-[13px] text-[#647994] sm:text-sm">
              {(post as any).userHandle ? (post as any).userHandle : "no handle"} · {formatRelativeTime(post.createdAt)}
            </span>
          </button>
        </div>

        {menuSlot ?? <PostMenu label="Post options" />}
      </div>

      {/* Sharer description - above reshare indicator */}
      {post.reshareOf && post.content?.trim() ? (
        <button
          onClick={() => onSelectPost(post)}
          className="block w-full cursor-pointer px-3 pb-3 pt-3 text-left transition hover:opacity-80 sm:px-4"
          type="button"
        >
          <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.55] text-[#1d2c23]">
            {post.content}
          </p>
        </button>
      ) : null}

      {/* Reshare indicator: opens ORIGINAL post */}
      {post.reshareOf && post.reshareData && (
        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            const originalId = post.reshareData?.originalPostId || post.reshareOf;
            try {
              const res = await fetch('/api/posts/' + originalId, { cache: "no-store" });
              const data = await res.json();
              if (res.ok && data?.post) onSelectPost(data.post);
              else onSelectPost({ _id: originalId, id: originalId, content: post.reshareData?.originalContent || "", images: post.reshareData?.originalImages || [], userId: post.reshareData?.originalUserId || "", userName: post.reshareData?.originalUserName || "Unknown user", userImage: post.reshareData?.originalUserImage || null, userHandle: (post.reshareData as any)?.originalUserHandle || null, createdAt: post.createdAt } as any);
            } catch { onSelectPost({ _id: originalId, id: originalId, content: post.reshareData?.originalContent || "", images: post.reshareData?.originalImages || [], userId: post.reshareData?.originalUserId || "", userName: post.reshareData?.originalUserName || "Unknown user", userImage: post.reshareData?.originalUserImage || null, userHandle: (post.reshareData as any)?.originalUserHandle || null, createdAt: post.createdAt } as any); }
          }}
          className={`${post.content?.trim() ? "mt-0" : "mt-3"} flex w-full items-center gap-2 border-y border-[#e3ebe6] px-3 py-2.5 text-left text-xs text-[#64776b] transition hover:bg-[#f7faf8] dark:border-[#1e3a2f] dark:text-[#9bb0a8] dark:hover:bg-[#17291f] sm:px-4`}
        >
          <svg className="h-4 w-4 shrink-0 text-[#168b45] dark:text-[#7ee0b0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>
          <span className="min-w-0 flex-1 truncate"><b className="font-semibold text-[#168b45] dark:text-[#7ee0b0]">{post.userName}</b>{" "}reshared a post by{" "}<b className="font-semibold text-[#168b45] dark:text-[#7ee0b0]">{post.reshareData.originalUserName || "Unknown user"}</b></span>
          <svg className="h-3.5 w-3.5 shrink-0 text-[#9aa79f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      )}

      {/* Original content - below indicator, or own content if not reshare */}
      {post.reshareOf ? (
        post.reshareData?.originalContent?.trim() ? (
          <button onClick={async () => { const originalId = post.reshareData?.originalPostId || post.reshareOf; if (originalId) { try { const res = await fetch("/api/posts/" + originalId, { cache: "no-store" }); const data = await res.json(); if (res.ok && data?.post) onSelectPost(data.post); else onSelectPost(post); } catch { onSelectPost(post); } } else onSelectPost(post); }} className="block w-full cursor-pointer px-3 pb-3 pt-3 text-left transition hover:opacity-80 sm:px-4" type="button"><p className="whitespace-pre-wrap break-words text-[15px] leading-[1.55] text-[#1d2c23]">{post.reshareData.originalContent}</p></button>
        ) : null
      ) : post.content?.trim() ? (
        <button onClick={() => onSelectPost(post)} className="block w-full cursor-pointer px-3 pb-3 pt-3 text-left transition hover:opacity-80 sm:px-4" type="button"><p className="whitespace-pre-wrap break-words text-[15px] leading-[1.55] text-[#1d2c23]">{post.content}</p></button>
      ) : null}

      {/* Facebook-style image grid */}
      {imageList.length > 0 && (
        <button
          onClick={() => onSelectPost(post)}
          className={`${hasBodyText ? "mt-0" : "mt-3"} block w-full cursor-pointer overflow-hidden rounded-none border-0 bg-[#f5f7f5] transition hover:opacity-95`}
          type="button"
          aria-label="Open post images"
        >
          {imageList.length === 1 ? (
            <img
              src={imageList[0]}
              alt="Post"
              className="block h-auto max-h-[620px] min-h-[220px] w-full rounded-none object-cover max-md:max-h-[520px]"
            />
          ) : (
            (() => {
              const shown = imageList.slice(0, 5);
              const extra = imageList.length - 5;

              return (
                <div
                  className={`grid gap-[2px] bg-white ${imageGridClass[shown.length]}`}
                >
                  {shown.map((image, index) => (
                    <div
                      key={`${postId}-image-${index}`}
                      className={`relative min-h-0 overflow-hidden ${imageTileSpan[shown.length][index]}`}
                    >
                      <img
                        src={image}
                        alt={`Post ${index + 1}`}
                        className="h-full w-full object-cover"
                      />

                      {index === 4 && extra > 0 && (
                        <span className="absolute inset-0 grid place-items-center bg-black/50 text-2xl font-semibold text-white">
                          +{extra}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </button>
      )}

      {/* All reactions = highlights + emoji reactions, plain text only */}
      <div className="mx-3 mt-3 flex items-center justify-between gap-2 border-b border-[#edf2ee] pb-2.5 text-xs text-[#718078] dark:border-[#1e3a2f] dark:text-[#9bb0a8] sm:mx-4">
        <span>
          {allReactions > 0 ? `All reactions · ${allReactions}` : "No reactions yet"}
        </span>

        {(commentsCount > 0 || sharesCount > 0) && (
          <button
            type="button"
            onClick={() => onSelectPost(post)}
            className="truncate text-right transition hover:text-[#168b45]"
          >
            {commentsCount > 0 &&
              `${commentsCount} ${commentsCount === 1 ? "comment" : "comments"}`}
            {commentsCount > 0 && sharesCount > 0 && " · "}
            {sharesCount > 0 &&
              `${sharesCount} ${sharesCount === 1 ? "share" : "shares"}`}
          </button>
        )}
      </div>

      {/* Compact action bar */}
      <div className="relative px-3 py-2 sm:px-4">
        <PostActionBar
          highlighted={highlightedByUser}
          highlightCount={highlightCount}
          commentCount={commentsCount}
          viewCount={openedCount}
          bookmarked={isBookmarked}
          onHighlight={handleHighlight}
          onHighlightLongPress={() => setShowReactions(true)}
          onBookmark={() => onBookmark?.(post)}
          onComment={() => {
            onComment(post);
            onToggleCommenting(postId);
          }}
          onViews={() => onSelectPost(post)}
          onShare={() => setShareModalOpen(true)}
          showCounts={true}
        />
        {/* Reaction picker – anchored above Highlight, closes on outside tap */}
        {showReactions && (
          <>
            {/* Full-screen transparent catcher – any tap outside emojis closes picker */}
            <button
              type="button"
              aria-label="Close reactions"
              onClick={() => setShowReactions(false)}
              className="fixed inset-0 z-10 cursor-default bg-transparent"
              tabIndex={-1}
            />
            <div
              ref={pickerRef}
              className="absolute bottom-[60px] left-3 z-20 flex max-w-[calc(100%-24px)] flex-wrap items-center gap-1.5 rounded-2xl border border-[#dcebe1] bg-white p-2 shadow-[0_8px_28px_rgba(15,39,28,0.16)] dark:border-[#1e3a2f] dark:bg-[#18231f] sm:left-4"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {reactionOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleReactionSelect(option.emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-[22px] leading-none transition hover:scale-110 hover:bg-[#eef8f1] active:scale-95 dark:hover:bg-[#1f332b] ${
                    myReaction === option.emoji ? "bg-[#e3f4e9] ring-1 ring-[#b9d9c6] dark:bg-[#143a26] dark:ring-[#1e3a2f]" : ""
                  }`}
                  aria-label={option.label}
                  title={option.label}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

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
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-[#718078] dark:text-[#9bb0a8]">
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
          className="shrink-0 text-xs font-semibold text-[#168b45] transition hover:text-[#0c6831] dark:text-[#7ee0b0]"
          type="button"
        >
          Open discussion
        </button>
      </div>

      {/* Most liked comment, at the bottom of the post */}
      {topComment && (
        <div className="px-3 pb-3 sm:px-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#718078] dark:text-[#9bb0a8]">
            Top comment
          </p>

          <button
            type="button"
            onClick={() => onSelectPost(post)}
            className="flex w-full items-start gap-2 text-left"
          >
            <MiniFace
              src={topComment.comment?.userImage}
              name={topComment.comment?.userName}
            />

            <span className="relative min-w-0 max-w-full">
              <span className="block rounded-2xl bg-[#f0f2f1] px-3 py-2 dark:bg-[#24382f]">
                <span className="flex items-center gap-1 text-[13px] font-semibold text-[#15271d] dark:text-[#e6ece9]">
                  <span className="truncate">
                    {topComment.comment?.userName || "Unknown user"}
                  </span>
                  <AuthorBadge
                    userId={topComment.comment?.userId}
                    viewerId={sessionUserId}
                    isPro={proHint(topComment.comment)}
                    size={13}
                  />
                </span>
                <span className="line-clamp-2 break-words text-[14px] leading-5 text-[#15271d] dark:text-[#e6ece9]">
                  {topComment.comment?.content}
                </span>
              </span>

              {topComment.likes > 0 && (
                <span className="absolute -bottom-2.5 right-2 flex items-center gap-1 rounded-full border border-[#e3ebe6] bg-white px-1.5 py-0.5 text-[11px] text-[#718078] shadow-sm dark:border-[#1e3a2f] dark:bg-[#101a17] dark:text-[#9bb0a8]">
                  <Heart size={11} className="fill-[#f43f68] text-[#f43f68]" />
                  {topComment.likes}
                </span>
              )}
            </span>
          </button>
        </div>
      )}

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