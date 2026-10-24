"use client";

import { Heart, X, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PostImageGrid } from "./post-image-grid";
import { ReplyModal } from "./reply-modal";
import { useModalHistory } from "./use-modal-history";
import { createClientNotification } from "@/lib/notifications-client";
import { ShareModal } from "./share-modal";
import { PostActionBar } from "./post-action-bar";
import { PostMenu, VerifiedBadge, n } from "./post-extras";
import { PostFollowButtons } from "./post-follow-buttons";

type CommentReply = {
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
  likes?: number;
  likedBy?: string[];
  replies?: CommentReply[];
};

// kept as an alias so every count in this file can never go below 0
const clamp0 = n;

type FeedPost = {
  id?: string;
  _id?: string;
  content?: string;
  images?: string[] | null;
  userId?: string;
  userName?: string | null;
  userImage?: string | null;
  likes?: number;
  comments?: number;
  shares?: number;
  likedBy?: string[]; // legacy -> maps to highlightedBy
  highlightedBy?: string[];
  scrolled?: string[];
  scrolledAt?: Record<string, string>;
  opened?: string[];
  reactions?: Record<string, string> | null; // { [userId]: emoji }
  reshareOf?: string | null;
  reshareCount?: number;
  reshareData?: {
    originalPostId?: string;
    originalContent?: string;
    originalImages?: string[];
    originalUserName?: string | null;
    originalUserImage?: string | null;
    originalUserId?: string | null;
  } | null;
  highlightCount?: number;
  highlightedByUser?: string[];
  commentsList?: CommentItem[];
  createdAt?: string | Date;
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

// A plain "like" (heart button) counts as this emoji when no specific reaction is saved
const DEFAULT_LIKE_EMOJI = reactionOptions[1].emoji;

/* =========================================================
   THEME TOKENS – one place for every light/dark pair so the
   whole page stays consistent (same palette as the bottom nav)
========================================================== */
const ui = {
  page: "bg-white dark:bg-[#101a17]",
  text: "text-[#15271d] dark:text-[#e6ece9]",
  muted: "text-[#718078] dark:text-[#9bb0a8]",
  border: "border-[#e3ebe6] dark:border-[#1e3a2f]",
  // lighter than the page in dark mode so comments and replies are easy to read
  bubble: "bg-[#f0f2f1] dark:bg-[#24382f]",
  hover: "hover:bg-[#f2f6f3] dark:hover:bg-[#1f332b]",
  accent: "text-[#168b45] dark:text-[#7ee0b0]",
  panel: "border-[#dcebe1] bg-white dark:border-[#1e3a2f] dark:bg-[#18231f]",
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

function countReplies(comment: CommentItem) {
  return Array.isArray(comment.replies) ? comment.replies.length : 0;
}

function getInitials2(name?: string | null) {
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
  const hasSrc =
    !!src && typeof src === "string" && src.trim().length > 0 && !errored;

  if (!hasSrc) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8efe8] font-semibold text-[#2f6b4f] dark:bg-[#24382f] dark:text-[#7ee0b0] ${className}`}
        aria-label={alt || "User"}
      >
        <span className="text-xs leading-none">{getInitials2(alt)}</span>
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full bg-[#e8efe8] dark:bg-[#24382f] ${className}`}
    >
      <img
        src={String(src)}
        alt={alt || "User"}
        className="h-full w-full object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

/* =========================================================
   SWIPE HELPER
   Horizontal swipe between slides. Vertical scrolling still
   works (the element needs the `touch-pan-y` class).
========================================================== */
function useSwipe({
  index,
  count,
  onChange,
}: {
  index: number;
  count: number;
  onChange: (next: number) => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const moved = useRef(false);
  const startX = useRef(0);
  const width = useRef(1);

  const reset = () => {
    active.current = false;
    setDragging(false);
    setDragX(0);
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (count < 2) return;
      active.current = true;
      moved.current = false;
      startX.current = e.clientX;
      width.current = e.currentTarget.clientWidth || 1;
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!active.current) return;

      let dx = e.clientX - startX.current;

      if (!moved.current) {
        if (Math.abs(dx) < 8) return; // still a tap
        moved.current = true;
        setDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }

      // Rubber-band at the first / last slide
      const atStart = index === 0 && dx > 0;
      const atEnd = index === count - 1 && dx < 0;
      if (atStart || atEnd) dx *= 0.3;

      setDragX(dx);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!active.current) return;

      if (moved.current) {
        const dx = e.clientX - startX.current;
        const threshold = Math.min(80, width.current * 0.2);

        if (dx < -threshold && index < count - 1) onChange(index + 1);
        else if (dx > threshold && index > 0) onChange(index - 1);
      }

      reset();
    },
    onPointerCancel: reset,
  };

  const trackStyle: React.CSSProperties = {
    transform: `translateX(calc(${-index * 100}% + ${dragX}px))`,
    transition: dragging
      ? "none"
      : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
    willChange: "transform",
  };

  // True right after a swipe, so the following "click" can be ignored
  const wasDrag = () => moved.current;

  return { handlers, trackStyle, wasDrag };
}

/* =========================================================
   FULL SCREEN IMAGE VIEWER
========================================================== */
function ImageViewer({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const swipe = useSwipe({ index, count: images.length, onChange: setIndex });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex((i) => Math.min(images.length - 1, i + 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length]);

  return (
    <div className="fixed inset-0 z-[70] bg-black" role="dialog" aria-modal="true" aria-label="Image viewer">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm">
          {index + 1} / {images.length}
        </span>

        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition active:scale-90"
          aria-label="Close image"
        >
          <X size={22} />
        </button>
      </div>

      <div
        className="h-full w-full touch-pan-y select-none overflow-hidden"
        {...swipe.handlers}
      >
        <div className="flex h-full" style={swipe.trackStyle}>
          {images.map((src, idx) => (
            <div
              key={`${idx}-full`}
              className="flex h-full w-full shrink-0 items-center justify-center"
            >
              <img
                src={src}
                alt={`Image ${idx + 1}`}
                draggable={false}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {images.map((_, idx) => (
            <span
              key={`${idx}-full-dot`}
              className={`h-1.5 rounded-full transition-all ${
                idx === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PostDetailModal({
  post,
  onClose,
  onSelectPost,
  sessionUserId,
}: {
  post: FeedPost;
  onClose: () => void;
  onSelectPost?: (post: FeedPost) => void;
  sessionUserId: string | null;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const deriveHb = (p: FeedPost): string[] =>
    Array.isArray((p as any).highlightedBy)
      ? (p as any).highlightedBy
      : Array.isArray(p.highlightedByUser)
        ? p.highlightedByUser!
        : Array.isArray(p.likedBy)
          ? p.likedBy!
          : [];
  const [likeCount, setLikeCount] = useState(clamp0(deriveHb(post).length || post.highlightCount || post.likes));
  const [shareCount, setShareCount] = useState(clamp0(post.shares));
  const [openedCount, setOpenedCount] = useState(clamp0(Array.isArray(post.opened) ? post.opened.length : 0));
  const [highlightCount, setHighlightCount] = useState(clamp0(deriveHb(post).length || post.highlightCount || 0));
  const [hasHighlighted, setHasHighlighted] = useState(
    sessionUserId ? deriveHb(post).includes(sessionUserId) : false
  );
  const [hasLiked, setHasLiked] = useState(
    sessionUserId ? deriveHb(post).includes(sessionUserId) : false
  );
  const [reactionMap, setReactionMap] = useState<Record<string, string>>(
    () =>
      post.reactions && typeof post.reactions === "object"
        ? { ...post.reactions }
        : {}
  );
  const [showReactions, setShowReactions] = useState(false);
  const [commentsList, setCommentsList] = useState<CommentItem[]>(
    Array.isArray(post.commentsList) ? post.commentsList : []
  );
  const [newComment, setNewComment] = useState("");
  const [replyTarget, setReplyTarget] = useState<
    { commentId: string; userName: string } | null
  >(null);
  const [replyText, setReplyText] = useState("");
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [repliesModalOpen, setRepliesModalOpen] = useState(false);
  const [repliesTarget, setRepliesTarget] = useState<CommentItem | null>(null);
  const [replyingToUserName, setReplyingToUserName] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const discussionRef = useRef<HTMLDivElement | null>(null);
  const viewLoggedRef = useRef(false);

  useModalHistory(onClose);

  const imageList = (
    (post.reshareOf && post.reshareData?.originalImages ? post.reshareData.originalImages : post.images) || []
  ).filter(
    (image): image is string => typeof image === "string" && image.trim().length > 0
  );
  const totalImages = imageList.length;

  const totalReplyCount = commentsList.reduce(
    (sum, comment) => sum + countReplies(comment),
    0
  );

  const myReaction = sessionUserId ? reactionMap[sessionUserId] ?? null : null;
  const reactionCountDisplay = clamp0(Object.keys(reactionMap).length);
  const hasReaction = Boolean(myReaction);
  const commentsTotal = clamp0(commentsList.length);
  const sharesTotal = clamp0(shareCount);
  // total of highlights + emoji reactions, shown as plain text (no emojis, no hearts)
  const allReactions = clamp0(highlightCount) + reactionCountDisplay;

  // Who has highlighted the post right now (server data adjusted by the local like state) – likes == highlights now
  const likedByIds = useMemo(() => {
    const base = deriveHb(post);
    const ids = new Set(base);
    if (sessionUserId) {
      if (hasLiked) ids.add(sessionUserId);
      else ids.delete(sessionUserId);
    }
    return [...ids];
  }, [(post as any).highlightedBy, (post as any).highlightedByUser, post.likedBy, hasLiked, sessionUserId]);

  // Most used reaction on this post
  const topReaction = useMemo(() => {
    const userIds = new Set([...likedByIds, ...Object.keys(reactionMap)]);
    const tally = new Map<string, number>();

    userIds.forEach((id) => {
      const emoji = reactionMap[id] ?? (likedByIds.includes(id) ? DEFAULT_LIKE_EMOJI : null);
      if (emoji) tally.set(emoji, (tally.get(emoji) ?? 0) + 1);
    });

    let best: string | null = null;
    let bestCount = 0;

    for (const { emoji } of reactionOptions) {
      const count = tally.get(emoji) ?? 0;
      if (count > bestCount) {
        best = emoji;
        bestCount = count;
      }
    }

    return best;
  }, [likedByIds, reactionMap]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Escape closes the full screen image first, then the post
      if (viewerIndex !== null) setViewerIndex(null);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, viewerIndex]);

  useEffect(() => {
    const postId = post._id ?? post.id;
    if (!postId || viewLoggedRef.current) return;
    viewLoggedRef.current = true; // avoids double counting in React strict mode

    async function recordView() {
      try {
        const response = await fetch(`/api/posts/${postId}/view`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) return;

        const data = await response.json().catch(() => null);
        if (typeof data?.opened === "number") {
          setOpenedCount(clamp0(data.opened));
        }
      } catch (err) {
        console.error("Failed to record post view:", err);
      }
    }

    recordView();
  }, [post._id, post.id]);

  async function handleLike() {
    const previousLiked = hasLiked;
    const previousCount = likeCount;

    setHasLiked(!hasLiked);
    setLikeCount(clamp0(!hasLiked ? likeCount + 1 : likeCount - 1));
    // highlight is the same as like now – keep in sync and clamp
    setHasHighlighted(!hasLiked);
    setHighlightCount(clamp0(!hasLiked ? highlightCount + 1 : highlightCount - 1));

    try {
      const response = await fetch(`/api/posts/${post._id ?? post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "highlight" }),
      });

      if (!response.ok) {
        setHasLiked(previousLiked);
        setLikeCount(clamp0(previousCount));
        setHasHighlighted(previousLiked);
        setHighlightCount(clamp0(previousCount));
      } else {
        const data = await response.json().catch(() => ({}));
        if (typeof data?.highlightCount === "number") {
          const c = clamp0(data.highlightCount);
          setLikeCount(c);
          setHighlightCount(c);
        }
      }
    } catch (error) {
      console.error("Failed to like post:", error);
      setHasLiked(previousLiked);
      setLikeCount(clamp0(previousCount));
      setHasHighlighted(previousLiked);
      setHighlightCount(clamp0(previousCount));
    }
  }

  async function handleHighlight() {
    const previous = hasHighlighted;
    const previousCount = highlightCount;

    setHasHighlighted(!hasHighlighted);
    setHighlightCount(clamp0(!hasHighlighted ? highlightCount + 1 : highlightCount - 1));
    // keep like in sync
    setHasLiked(!hasHighlighted);
    setLikeCount(clamp0(!hasHighlighted ? likeCount + 1 : likeCount - 1));

    try {
      const response = await fetch(`/api/posts/${post._id ?? post.id}/highlight`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ highlighted: !previous }),
      });

      if (!response.ok) {
        setHasHighlighted(previous);
        setHighlightCount(clamp0(previousCount));
        setHasLiked(previous);
        setLikeCount(clamp0(previousCount));
      } else {
        const data = await response.json().catch(() => ({}));
        if (typeof data?.highlightCount === "number") {
          const c = clamp0(data.highlightCount);
          setHighlightCount(c);
          setLikeCount(c);
        }
      }
    } catch (error) {
      console.error("Failed to highlight post:", error);
      setHasHighlighted(previous);
      setHighlightCount(clamp0(previousCount));
      setHasLiked(previous);
      setLikeCount(clamp0(previousCount));
    }
  }

  async function handleReactionSelect(emoji: string) {
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
      const response = await fetch(`/api/posts/${post._id ?? post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", emoji }),
      });

      if (!response.ok) throw new Error("Reaction failed");
      const data = await response.json().catch(() => null);
      if (data?.reactions && typeof data.reactions === "object") {
        setReactionMap({ ...(data.reactions as Record<string,string>) });
      }
    } catch (error) {
      console.error("Failed to save reaction:", error);
      apply(previous);
    }
  }

  function scrollToDiscussion() {
    discussionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleShare() {
    try {
      const response = await fetch(`/api/posts/${post._id ?? post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share" }),
      });

      if (response.ok) {
        const data = await response.json();
        if (typeof data?.post?.shares === "number") {
          setShareCount(clamp0(data.post.shares));
        }
      }
    } catch (error) {
      console.error("Failed to share post:", error);
    }
  }

  async function handleReshare() {
    try {
      const response = await fetch(`/api/posts/${post._id ?? post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reshare" }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.post) {
          // Refresh the post data with the new reshare count
          const updatedPost = { ...post, reshareCount: (post.reshareCount ?? 0) + 1 };
          // We can't directly update the parent, but the share modal handles it
        }
      }
    } catch (error) {
      console.error("Failed to reshare post:", error);
    }
  }

  async function handleCommentSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!newComment.trim() || isSubmittingComment || !sessionUserId) return;

    const optimisticComment: CommentItem = {
      _id: `optimistic-comment-${Date.now()}`,
      userId: sessionUserId,
      userName: "You",
      userImage: null,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      replies: [],
    };

    setCommentsList((current) => [...current, optimisticComment]);
    setNewComment("");
    setIsSubmittingComment(true);

    try {
      const response = await fetch(`/api/posts/${post._id ?? post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", comment: optimisticComment.content }),
      });

      const data = await response.json();

      if (response.ok && data?.post?.commentsList) {
        setCommentsList(data.post.commentsList);
      }

      if (response.ok && post.userId && post.userId !== sessionUserId && data?.post?.commentsList) {
        const targetComment = data.post.commentsList[data.post.commentsList.length - 1];
        if (targetComment && targetComment.userId !== sessionUserId) {
          await createClientNotification({
            actorId: sessionUserId,
            receiverId: post.userId,
            creatorId: post.userId,
            actorName: "You",
            type: "comment",
            postId: String(post._id ?? post.id),
            commentId: String(targetComment._id),
            message: "You commented on their post",
            link: `/posts/${String(post._id ?? post.id)}#comment-${String(targetComment._id)}`,
          });
        }
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
      setCommentsList((current) =>
        current.filter((comment) => String(comment._id) !== String(optimisticComment._id))
      );
    } finally {
      setIsSubmittingComment(false);
    }
  }

  useEffect(() => {
    if (!sessionUserId) return;
    const pid = String((post as any)._id ?? post.id ?? "");
    if (!pid) return;
    fetch("/api/bookmarks", { credentials: "include" })
      .then((r) => r.json().catch(() => ({} as any)))
      .then((d: any) => {
        if (Array.isArray(d?.bookmarkedIds)) setIsBookmarked(d.bookmarkedIds.includes(pid));
      })
      .catch(() => {});
  }, [(post as any)._id, post.id, sessionUserId]);

  async function handleBookmark() {
    const pid = String((post as any)._id ?? post.id ?? "");
    if (!pid || !sessionUserId) return;
    const next = !isBookmarked;
    setIsBookmarked(next);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: pid, bookmarked: next }),
      });
      const d = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(d?.message || "Bookmark failed");
      if (typeof d.bookmarked === "boolean") setIsBookmarked(d.bookmarked);
    } catch {
      setIsBookmarked(!next);
    }
  }

  async function handleCommentReaction(commentId: string) {
    if (!sessionUserId) return;

    const target = commentsList.find(
      (comment) => String(comment._id) === String(commentId)
    );
    if (!target) return;

    const alreadyLiked =
      Array.isArray(target.likedBy) && target.likedBy.includes(sessionUserId);

    setCommentsList((current) =>
      current.map((comment) => {
        if (String(comment._id) !== String(commentId)) return comment;
        const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
        const nextLikedBy = alreadyLiked
          ? likedBy.filter((id) => id !== sessionUserId)
          : [...new Set([...likedBy, sessionUserId])];
        return {
          ...comment,
          likedBy: nextLikedBy,
          likes: clamp0(Number(comment.likes ?? 0) + (alreadyLiked ? -1 : 1)),
        };
      })
    );

    try {
      const response = await fetch(`/api/posts/${post._id ?? post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like-comment", commentId }),
      });

      const data = await response.json();

      if (response.ok && data?.post?.commentsList) {
        setCommentsList(data.post.commentsList);
      }

      if (response.ok && !alreadyLiked && target.userId && target.userId !== sessionUserId) {
        await createClientNotification({
          actorId: sessionUserId,
          receiverId: target.userId,
          creatorId: post.userId || target.userId,
          actorName: "You",
          type: "comment-reaction",
          postId: String(post._id ?? post.id),
          commentId: String(commentId),
          message: "You reacted to their comment",
          link: `/posts/${String(post._id ?? post.id)}#comment-${String(commentId)}`,
        });
      }
    } catch (error) {
      console.error("Failed to like comment:", error);
      setCommentsList((current) =>
        current.map((comment) => {
          if (String(comment._id) !== String(commentId)) return comment;
          const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
          const nextLikedBy = alreadyLiked
            ? [...new Set([...likedBy, sessionUserId])]
            : likedBy.filter((id) => id !== sessionUserId);
          return {
            ...comment,
            likedBy: nextLikedBy,
            likes: clamp0(Number(comment.likes ?? 0) + (alreadyLiked ? 1 : -1)),
          };
        })
      );
    }
  }

  function handleReplyToUser(userName: string) {
    setReplyingToUserName(userName);
    setReplyText((current) => {
      const mention = `@${userName} `;
      if (!current.trim()) return mention;
      if (current.includes(mention) || current.includes(`@${userName}`)) return current;
      return `${current.trim()} ${mention}`;
    });
  }

  async function handleReplySubmit(replyMessage: string) {
    const targetCommentId = repliesTarget?._id ?? replyTarget?.commentId;
    const trimmed = replyMessage.trim();
    if (!targetCommentId || !trimmed || !sessionUserId) return;

    const optimisticReply: CommentReply = {
      _id: `optimistic-reply-${Date.now()}`,
      userId: sessionUserId,
      userName: "You",
      userImage: null,
      content: trimmed,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      replyTo: replyingToUserName ? { userName: replyingToUserName } : null,
    };

    setCommentsList((current) =>
      current.map((comment) => {
        if (String(comment._id) !== String(targetCommentId)) return comment;
        return {
          ...comment,
          replies: Array.isArray(comment.replies)
            ? [...comment.replies, optimisticReply]
            : [optimisticReply],
        };
      })
    );

    if (repliesTarget) {
      setRepliesTarget((current) =>
        current
          ? {
              ...current,
              replies: Array.isArray(current.replies)
                ? [...current.replies, optimisticReply]
                : [optimisticReply],
            }
          : current
      );
    }

    try {
      const response = await fetch(`/api/posts/${post._id ?? post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply-comment",
          commentId: targetCommentId,
          reply: trimmed,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.post?.commentsList) {
        setCommentsList(data.post.commentsList);
        setRepliesTarget(
          data.post.commentsList.find(
            (comment: CommentItem) => String(comment._id) === String(targetCommentId)
          ) ?? null
        );
      }
    } catch (error) {
      console.error("Failed to reply to comment:", error);
      setCommentsList((current) =>
        current.map((comment) => {
          if (String(comment._id) !== String(targetCommentId)) return comment;
          return {
            ...comment,
            replies: Array.isArray(comment.replies)
              ? comment.replies.filter((reply) => String(reply._id) !== String(optimisticReply._id))
              : [],
          };
        })
      );
    } finally {
      setReplyText("");
      setReplyingToUserName(null);
      setReplyTarget(null);
      setReplyModalOpen(false);
      setRepliesModalOpen(false);
      setRepliesTarget(null);
    }
  }

  async function handleLikeReply(replyId: string) {
    if (!sessionUserId) return;

    let targetCommentId: string | null = null;

    setCommentsList((current) =>
      current.map((comment) => {
        if (!Array.isArray(comment.replies)) return comment;
        const reply = comment.replies.find((entry) => String(entry._id) === String(replyId));
        if (!reply) return comment;
        targetCommentId = String(comment._id ?? "");
        const likedBy = Array.isArray(reply.likedBy) ? reply.likedBy : [];
        const hasLiked = likedBy.includes(sessionUserId);

        return {
          ...comment,
          replies: comment.replies.map((entry) => {
            if (String(entry._id) !== String(replyId)) return entry;
            return {
              ...entry,
              likedBy: hasLiked
                ? likedBy.filter((id) => id !== sessionUserId)
                : [...new Set([...likedBy, sessionUserId])],
              likes: clamp0(Number(entry.likes ?? 0) + (hasLiked ? -1 : 1)),
            };
          }),
        };
      })
    );

    if (!targetCommentId) return;

    try {
      const response = await fetch(`/api/posts/${post._id ?? post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like-comment", commentId: targetCommentId, replyId }),
      });

      const data = await response.json();
      if (response.ok && data?.post?.commentsList) {
        setCommentsList(data.post.commentsList);
      }
    } catch (error) {
      console.error("Failed to like reply:", error);
    }
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${ui.page} ${ui.text}`}>
      {/* =========================================================
          CREATOR HEADER
      ========================================================== */}
      <div
        className={`relative z-[45] flex shrink-0 items-center gap-3 border-b px-3 py-3 ${ui.border} ${ui.page}`}
      >
        <Face
          src={post.userImage}
          alt={post.userName}
          className="h-10 w-10"
        />

        <div className="min-w-0 flex-1">
          {/* Name + Follow (blue) / Add netizen (sends a real request) */}
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <p className={`min-w-0 truncate font-semibold ${ui.text}`}>
                {post.userName}
              </p>
              <VerifiedBadge />
            </div>
            <PostFollowButtons userId={post.userId} viewerId={sessionUserId} />
          </div>

          <p className={`text-xs ${ui.muted}`}>
            {(post as any).userHandle ? (post as any).userHandle : "no handle"} · {formatRelativeTime(post.createdAt)}
          </p>
        </div>

        <PostMenu label="Post options" />

        <button
          type="button"
          onClick={onClose}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${ui.text} transition ${ui.hover}`}
          aria-label="Close post"
        >
          <X size={20} />
        </button>
      </div>

      {/* Sharer description - above reshare indicator */}
      {post.reshareOf && post.content?.trim() ? (
        <div className={`shrink-0 px-3 py-4 ${ui.page}`}>
          <p className={`whitespace-pre-wrap break-words text-[15px] leading-[1.55] ${ui.text}`}>
            {post.content}
          </p>
        </div>
      ) : null}

      {/* Reshare indicator - opens ORIGINAL post */}
      {post.reshareOf && post.reshareData && (
        <div className={`shrink-0 border-b px-3 py-2 ${ui.border} ${ui.page}`}>
          <button
            type="button"
            onClick={async () => { const originalId = post.reshareData?.originalPostId || post.reshareOf; if (!originalId) return; try { const res = await fetch("/api/posts/" + originalId, { cache: "no-store" }); const data = await res.json(); if (res.ok && data?.post && onSelectPost) onSelectPost(data.post); } catch {} }}
            aria-label="Open original post"
            className="flex h-10 w-full items-center gap-2.5 rounded-full bg-[#e6f4ec] p-1 pr-3 text-left text-xs text-[#64776b] transition hover:bg-[#dcefe3] dark:bg-[#143a26] dark:text-[#9bb0a8] dark:hover:bg-[#1a4330]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6fb08a] text-white dark:bg-[#1f7a46]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 014-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 01-4 4H3" />
              </svg>
            </span>

            <span className="min-w-0 flex-1 truncate">
              <b className="font-semibold text-[#168b45] dark:text-[#7ee0b0]">{post.userName}</b>{" "}
              reshared a post by{" "}
              <b className="font-semibold text-[#168b45] dark:text-[#7ee0b0]">
                {post.reshareData.originalUserName || "Unknown user"}
              </b>
            </span>

            <svg className="h-4 w-4 shrink-0 text-[#168b45] dark:text-[#7ee0b0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l6 6-6 6" />
            </svg>
          </button>
        </div>
      )}

      {/* =========================================================
          MAIN SCROLL AREA
      ========================================================== */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-24">
        {/* Original content - below indicator; own content if not reshare */}
        {post.reshareOf ? (
          post.reshareData?.originalContent?.trim() ? (
            <div className={`shrink-0 px-3 py-4 ${ui.page}`}>
              <p className={`whitespace-pre-wrap break-words text-[15px] leading-[1.55] ${ui.text}`}>
                {post.reshareData.originalContent}
              </p>
            </div>
          ) : null
        ) : post.content?.trim() ? (
          <div className={`shrink-0 px-3 py-4 ${ui.page}`}>
            <p className={`whitespace-pre-wrap break-words text-[15px] leading-[1.55] ${ui.text}`}>
              {post.content}
            </p>
          </div>
        ) : null}

        {/* =======================================================
            IMAGES: Facebook-style grid, edge to edge, tap for full screen
        ======================================================== */}
        {totalImages > 0 && (
          <div className={`shrink-0 ${ui.page}`}>
            <PostImageGrid images={imageList} onImageClick={(i) => setViewerIndex(i)} />
          </div>
        )}

        {/* =======================================================
            REACTIONS SUMMARY + ACTION BAR + TOP REACTION
        ======================================================== */}
        <div className={`shrink-0 border-b ${ui.border} ${ui.page}`}>
          {/* All reactions = highlights + emoji reactions, plain text only */}
          <div
            className={`mx-3 mt-3 flex items-center justify-between gap-2 border-b pb-2.5 text-xs ${ui.border} ${ui.muted}`}
          >
            <span>
              {allReactions > 0 ? `All reactions · ${allReactions}` : "No reactions yet"}
            </span>

            {(commentsTotal > 0 || sharesTotal > 0) && (
              <span className="truncate text-right">
                {commentsTotal > 0 &&
                  `${commentsTotal} ${commentsTotal === 1 ? "comment" : "comments"}`}
                {commentsTotal > 0 && sharesTotal > 0 && " · "}
                {sharesTotal > 0 &&
                  `${sharesTotal} ${sharesTotal === 1 ? "share" : "shares"}`}
              </span>
            )}
          </div>

          {/* Action bar */}
          <div className="px-3 py-2">
            <PostActionBar
              highlighted={hasHighlighted}
              highlightCount={clamp0(highlightCount)}
              commentCount={commentsTotal}
              viewCount={clamp0(openedCount)}
              bookmarked={isBookmarked}
              onHighlight={handleHighlight}
              onHighlightLongPress={() => setShowReactions((v) => !v)}
              onComment={scrollToDiscussion}
              onViews={() => {}}
              onShare={() => setShareModalOpen(true)}
              onBookmark={handleBookmark}
              showCounts={true}
            />
          </div>

          {/* Reaction picker */}
          {showReactions && (
            <div
              className={`mx-3 mb-2 flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl border p-2 shadow-[0_6px_20px_rgba(15,39,28,0.18)] ${ui.panel}`}
            >
              {reactionOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleReactionSelect(option.emoji)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:scale-110 ${ui.hover} ${
                    myReaction === option.emoji
                      ? "bg-[#e3f4e9] dark:bg-[#143a26]"
                      : ""
                  }`}
                  aria-label={option.label}
                  title={option.label}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
          )}

          {/* Top reaction + scroll hint */}
          <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-1">
            <span className={`flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs ${ui.muted}`}>
              {topReaction && (
                <>
                  <span className="text-base leading-none">{topReaction}</span>
                  <span>top reaction</span>
                  {myReaction && <span>· you {myReaction}</span>}
                </>
              )}
            </span>

            <button
              type="button"
              onClick={scrollToDiscussion}
              className={`flex shrink-0 items-center gap-1 text-xs font-semibold transition ${ui.accent}`}
            >
              Scroll to see discussion
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* =======================================================
            DISCUSSION – Facebook-style, full width
        ======================================================== */}
        <div ref={discussionRef} className={`scroll-mt-2 py-4 ${ui.page}`}>
          {commentsTotal > 0 && (
            <h3 className={`px-3 pb-3 text-sm font-semibold ${ui.text}`}>
              Comments{" "}
              <span className={`font-normal ${ui.muted}`}>
                · {commentsTotal}
                {totalReplyCount > 0
                  ? ` · ${totalReplyCount} ${totalReplyCount === 1 ? "reply" : "replies"}`
                  : ""}
              </span>
            </h3>
          )}

          {commentsTotal === 0 ? (
            <p className={`px-3 py-4 text-sm ${ui.muted}`}>
              No comments yet. Be the first to comment.
            </p>
          ) : (
            <div className="space-y-5">
              {commentsList.map((comment, commentIndex) => {
                const commentId = String(comment._id ?? "");
                const replies = Array.isArray(comment.replies) ? comment.replies : [];
                const replyTotal = replies.length;
                const firstReply = replies[0];
                const commentLikes = clamp0(comment.likes);
                const firstReplyLikes = clamp0(firstReply?.likes);
                const isCommentLiked =
                  !!sessionUserId &&
                  Array.isArray(comment.likedBy) &&
                  comment.likedBy.includes(sessionUserId);

                return (
                  <div
                    key={commentId || `comment-${commentIndex}`}
                    className="flex items-start gap-2 px-3"
                  >
                    <Face
                      src={comment.userImage}
                      alt={comment.userName}
                      className="h-9 w-9"
                    />

                    <div className="min-w-0 flex-1">
                      {/* Bubble */}
                      <div className="relative inline-block max-w-full">
                        <div className={`rounded-2xl px-3 py-2 ${ui.bubble}`}>
                          <p className={`flex items-center gap-1 text-[13px] font-semibold ${ui.text}`}>
                            {comment.userName}
                            <VerifiedBadge size={13} />
                          </p>
                          <p className={`whitespace-pre-wrap break-words text-[14px] leading-5 ${ui.text}`}>
                            {comment.content}
                          </p>
                        </div>

                        {commentLikes > 0 && (
                          <span
                            className={`absolute -bottom-2.5 right-2 flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] shadow-sm ${ui.border} ${ui.page} ${ui.muted}`}
                          >
                            <Heart size={11} className="fill-[#f43f68] text-[#f43f68]" />
                            {commentLikes}
                          </span>
                        )}
                      </div>

                      {/* Time · Like · Reply · menu */}
                      <div
                        className={`flex items-center gap-4 px-3 text-xs font-semibold ${ui.muted} ${
                          commentLikes > 0 ? "mt-3" : "mt-1"
                        }`}
                      >
                        <span className="font-normal">
                          {formatRelativeTime(comment.createdAt)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCommentReaction(commentId)}
                          className={isCommentLiked ? "text-[#df4059]" : ""}
                        >
                          Like
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReplyTarget({
                              commentId,
                              userName: comment.userName || "this user",
                            });
                            setReplyModalOpen(true);
                          }}
                        >
                          Reply
                        </button>

                        <span className="ml-auto">
                          <PostMenu
                            size={16}
                            label="Comment options"
                            buttonClassName="grid h-7 w-7 place-items-center rounded-full text-[#718078] transition hover:bg-[#f2f6f3] dark:text-[#9bb0a8] dark:hover:bg-[#1f332b]"
                          />
                        </span>
                      </div>

                      {/* Only ONE reply is shown in full, the rest live in the replies modal */}
                      {firstReply && (
                        <div className="mt-3 flex items-start gap-2">
                          <Face
                            src={firstReply.userImage}
                            alt={firstReply.userName}
                            className="h-7 w-7"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="relative inline-block max-w-full">
                              <div className={`rounded-2xl px-3 py-2 ${ui.bubble}`}>
                                <p className={`flex items-center gap-1 text-[12px] font-semibold ${ui.text}`}>
                                  {firstReply.userName}
                                  <VerifiedBadge size={12} />
                                </p>
                                <p className={`whitespace-pre-wrap break-words text-[13px] leading-5 ${ui.text}`}>
                                  {firstReply.replyTo?.userName && (
                                    <span className={`mr-1 font-semibold ${ui.accent}`}>
                                      {firstReply.replyTo.userName}
                                    </span>
                                  )}
                                  {firstReply.content}
                                </p>
                              </div>

                              {firstReplyLikes > 0 && (
                                <span
                                  className={`absolute -bottom-2.5 right-2 flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] shadow-sm ${ui.border} ${ui.page} ${ui.muted}`}
                                >
                                  <Heart size={10} className="fill-[#f43f68] text-[#f43f68]" />
                                  {firstReplyLikes}
                                </span>
                              )}
                            </div>

                            <div
                              className={`flex items-center gap-4 px-3 text-xs font-semibold ${ui.muted} ${
                                firstReplyLikes > 0 ? "mt-3" : "mt-1"
                              }`}
                            >
                              <span className="font-normal">
                                {formatRelativeTime(firstReply.createdAt)}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  firstReply._id && handleLikeReply(String(firstReply._id))
                                }
                                className={
                                  !!sessionUserId &&
                                  Array.isArray(firstReply.likedBy) &&
                                  firstReply.likedBy.includes(sessionUserId)
                                    ? "text-[#df4059]"
                                    : ""
                                }
                              >
                                Like
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const name = firstReply.userName || "this user";
                                  setReplyTarget({ commentId, userName: name });
                                  setReplyingToUserName(name);
                                  setReplyText(`@${name} `);
                                  setReplyModalOpen(true);
                                }}
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
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reply count + see all replies (opens the replies modal for this comment) */}
                      {replyTotal > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setRepliesTarget(comment);
                            setRepliesModalOpen(true);
                          }}
                          className={`mt-3 flex items-center gap-2 text-xs font-semibold ${ui.accent}`}
                        >
                          <span className="h-px w-6 bg-current opacity-50" />
                          See all {replyTotal} {replyTotal === 1 ? "reply" : "replies"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          FIXED COMMENT INPUT
          LIKE A BOTTOM NAVIGATION BAR
      ========================================================== */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t px-3 py-3 backdrop-blur-md md:px-6 ${ui.border} bg-white/95 dark:bg-[#101a17]/95`}
      >
        <form
          onSubmit={handleCommentSubmit}
          className="mx-auto flex w-full max-w-5xl items-center gap-2"
        >
          <div
            className={`flex min-w-0 flex-1 items-center rounded-full px-4 focus-within:ring-2 focus-within:ring-[#1c9d57]/30 ${ui.bubble}`}
          >
            <input
              type="text"
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder={
                sessionUserId
                  ? "Write a comment..."
                  : "Sign in to comment..."
              }
              className={`min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#9aa79f] ${ui.text}`}
              disabled={!sessionUserId || isSubmittingComment}
            />
          </div>

          <button
            type="submit"
            disabled={
              !newComment.trim() ||
              isSubmittingComment ||
              !sessionUserId
            }
            className="shrink-0 rounded-full bg-[#1c9d57] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#138647] disabled:cursor-not-allowed disabled:bg-[#9aa79f] dark:disabled:bg-[#233d32]"
          >
            {isSubmittingComment ? "..." : "Post"}
          </button>
        </form>
      </div>

      {replyModalOpen && replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className={`w-full max-w-md rounded-3xl border p-4 shadow-2xl ${ui.panel}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className={`text-base font-semibold ${ui.text}`}>
                Reply to {replyTarget.userName}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setReplyModalOpen(false);
                  setReplyTarget(null);
                  setReplyText("");
                  setReplyingToUserName(null);
                }}
                className={`rounded-full px-3 py-1 text-xs ${ui.bubble} ${ui.muted}`}
              >
                Close
              </button>
            </div>

            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              rows={4}
              placeholder="Write a reply..."
              className={`w-full rounded-2xl px-3 py-2 text-sm outline-none placeholder:text-[#9aa79f] ${ui.bubble} ${ui.text}`}
            />

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplyModalOpen(false);
                  setReplyTarget(null);
                  setReplyText("");
                  setReplyingToUserName(null);
                }}
                className={`rounded-full border px-3 py-1.5 text-sm ${ui.border} ${ui.text}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReplySubmit(replyText)}
                disabled={!replyText.trim() || !sessionUserId}
                className="rounded-full bg-[#1c9d57] px-4 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replies Modal */}
      {repliesModalOpen && repliesTarget && (
        <ReplyModal
          isOpen={repliesModalOpen}
          comment={repliesTarget}
          sessionUserId={sessionUserId}
          onClose={() => {
            setRepliesModalOpen(false);
            setRepliesTarget(null);
            setReplyText("");
            setReplyingToUserName(null);
          }}
          onSubmit={async (replyMessage) => {
            await handleReplySubmit(replyMessage);
          }}
          onLikeReply={handleLikeReply}
          onReplyToUser={handleReplyToUser}
          replyText={replyText}
          setReplyText={setReplyText}
          replyingToUserName={replyingToUserName}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        post={post}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onReshare={handleReshare}
        sessionUserId={sessionUserId}
      />

      {/* Full screen image viewer */}
      {viewerIndex !== null && totalImages > 0 && (
        <ImageViewer
          images={imageList}
          startIndex={Math.min(viewerIndex, totalImages - 1)}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}