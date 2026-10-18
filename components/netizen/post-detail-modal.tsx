"use client";

import {
  Heart,
  Star,
  Plus,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  EyeOff,
  Flag,
  ThumbsUp,
  Bookmark,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "./app-shell";
import { PostImageGrid } from "./post-image-grid";
import { ReplyModal } from "./reply-modal";
import { useModalHistory } from "./use-modal-history";
import { createClientNotification } from "@/lib/notifications-client";
import { ShareModal } from "./share-modal";
import { PostActionBar } from "./post-action-bar";

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

function clamp0(n: any) { return Math.max(0, Math.floor(Number(n) || 0)); }

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
  const [replyDraft, setReplyDraft] = useState("");
  const [replyingToUserName, setReplyingToUserName] = useState<string | null>(null);
  const [commentReactionMenuId, setCommentReactionMenuId] = useState<string | null>(
    null
  );
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const discussionRef = useRef<HTMLDivElement | null>(null);
  const viewLoggedRef = useRef(false);

  useModalHistory(onClose);

  const imageList = (
    (post.reshareOf && post.reshareData?.originalImages ? post.reshareData.originalImages : post.images) || []
  ).filter(
    (image): image is string => typeof image === "string" && image.trim().length > 0
  );
  const totalImages = imageList.length;

  const gallerySwipe = useSwipe({
    index: currentImageIndex,
    count: totalImages,
    onChange: setCurrentImageIndex,
  });

  const totalReplyCount = commentsList.reduce(
    (sum, comment) => sum + countReplies(comment),
    0
  );

  const myReaction = sessionUserId ? reactionMap[sessionUserId] ?? null : null;
  const reactionCountDisplay = clamp0(Object.keys(reactionMap).length);
  const hasReaction = Boolean(myReaction);

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
          setOpenedCount(data.opened);
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
          setShareCount(data.post.shares);
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
          likes: Math.max(0, Number(comment.likes ?? 0) + (alreadyLiked ? -1 : 1)),
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
            likes: Math.max(0, Number(comment.likes ?? 0) + (alreadyLiked ? 1 : -1)),
          };
        })
      );
    } finally {
      setCommentReactionMenuId(null);
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
              likes: Math.max(0, Number(entry.likes ?? 0) + (hasLiked ? -1 : 1)),
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

  function nextImage() {
    setCurrentImageIndex((prev) => Math.min(totalImages - 1, prev + 1));
  }

  function prevImage() {
    setCurrentImageIndex((prev) => Math.max(0, prev - 1));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f7f5]">
      {/* =========================================================
          CREATOR HEADER
      ========================================================== */}
      <div className="relative z-30 flex shrink-0 items-center gap-3 border-b border-[#e3ebe6] bg-white px-5 py-4 md:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8efe8] text-sm font-semibold text-[#2f6b4f]">
          {post.userImage ? (
            <img
              src={post.userImage}
              alt={post.userName || "User"}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/shadow.png";
              }}
            />
          ) : (
            <img
              src="/shadow.png"
              alt={post.userName || "User"}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#15271d]">
            {post.userName}
          </p>

          <p className="text-xs text-[#9aa79f]">
            @{(post.userName || "user").toLowerCase().replace(/\s+/g, ".")}{" "}
            · {formatRelativeTime(post.createdAt)}
          </p>
        </div>

        <button
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#1a2c22] transition hover:bg-[#f2f6f3]"
          aria-label="Close post"
        >
          <X size={20} />
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#1a2c22] transition hover:bg-[#f2f6f3]"
          aria-label="Post options"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={20} />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-50 flex items-center justify-center"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            ></div>
            <div className="absolute right-2 top-6 w-64 rounded-xl border border-[#dfe7e4] bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#647994] hover:bg-[#f0f8f3] transition"
                >
                  <EyeOff size={16} className="shrink-0" />
                  <span>Remove from feed</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#647994] hover:bg-[#f0f8f3] transition border-t border-[#e5ece7] pt-4"
                >
                  <Flag size={16} className="shrink-0" />
                  <span>Report content</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#647994] hover:bg-[#f0f8f3] transition border-t border-[#e5ece7] pt-4"
                >
                  <ThumbsUp size={16} className="shrink-0" />
                  <span>See more of this</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#647994] hover:bg-[#f0f8f3] transition border-t border-[#e5ece7] pt-4"
                >
                  <Bookmark size={16} className="shrink-0" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Reshare indicator */}
      {post.reshareOf && post.reshareData && (
        <button
          type="button"
          onClick={() => onSelectPost?.(post)}
          className="w-full flex items-center justify-between gap-2 rounded-lg border-b border-[#e3ebe6] bg-[#f7faf8] px-3 py-3 text-sm text-[#5f7073] transition hover:bg-[#e7f7ed]"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-[#1c9d57]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 014-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
            <span className="text-sm text-[#5f7073]">
              <b className="text-[#1c9d57]">{post.userName}</b> reshared a post by{" "}
              <b className="text-[#1c9d57]">{post.reshareData.originalUserName || "Unknown user"}</b>
            </span>
          </div>
          <svg className="h-4 w-4 shrink-0 text-[#1c9d57]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l6 6-6 6" />
          </svg>
        </button>
      )}

      {/* =========================================================
          MAIN SCROLL AREA
      ========================================================== */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-21.5">
        {/* Description: show reshared post content if it's a reshare, otherwise own content */}
        {(post.reshareOf && post.reshareData?.originalContent?.trim()) || post.content?.trim() ? (
          <div className="shrink-0 border-b border-[#e3ebe6] bg-white px-5 py-4 md:px-6">
            <p className="whitespace-pre-wrap text-[16px] font-medium leading-7 text-[#15271d]">
              {post.reshareOf && post.reshareData?.originalContent?.trim()
                ? post.reshareData.originalContent
                : post.content}
            </p>
          </div>
        ) : null}

        {/* =======================================================
            IMAGES: swipe, buttons, tap for full screen
        ======================================================== */}
        {totalImages > 0 && (
          <div className="shrink-0 bg-white px-3 py-3">
            <PostImageGrid images={imageList} onImageClick={(i) => setViewerIndex(i)} />
          </div>
        )}

        {/* legacy swipe detail – hidden now that grid is primary; keep for fallback if needed */}
        {false && totalImages > 0 && (
          <div className="relative shrink-0 bg-black">
            <div
              className="touch-pan-y select-none overflow-hidden"
              {...gallerySwipe.handlers}
              onClick={() => {
                if (!gallerySwipe.wasDrag()) setViewerIndex(currentImageIndex);
              }}
            >
              <div className="flex" style={gallerySwipe.trackStyle}>
                {imageList.map((src, idx) => (
                  <div
                    key={`${idx}-slide`}
                    className="flex h-[52dvh] w-full shrink-0 items-center justify-center bg-black md:h-[60dvh]"
                  >
                    <img
                      src={src}
                      alt={`Post image ${idx + 1}`}
                      draggable={false}
                      className="h-full w-full cursor-zoom-in object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>

            {totalImages > 1 && (
              <>
                {/* COUNTER */}
                <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
                  {currentImageIndex + 1} / {totalImages}
                </span>

                {/* DOTS */}
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-2">
                  {imageList.map((_, idx) => (
                    <div
                      key={`${idx}-image-dot`}
                      className={`h-1 rounded-full transition-all ${
                        idx === currentImageIndex
                          ? "w-8 bg-white"
                          : "w-1 bg-white/50"
                      }`}
                    />
                  ))}
                </div>

                {/* PREVIOUS */}
                {currentImageIndex > 0 && (
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/55"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}

                {/* NEXT */}
                {currentImageIndex < totalImages - 1 && (
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/55"
                    aria-label="Next image"
                  >
                    <ChevronRight size={24} />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* =======================================================
            REACTIONS SUMMARY + ACTION BAR + TOP REACTION
        ======================================================== */}
        <div className="shrink-0 border-b border-[#e3ebe6] bg-white">
          {/* Summary */}
          <div className="mx-3 mt-3 flex items-center justify-between gap-2 border-b border-[#edf2ee] pb-2.5 text-xs text-[#718078]">
            <span className="flex items-center gap-1.5">
              {hasReaction && (
                <Heart size={13} className="fill-[#f43f68] text-[#f43f68]" />
              )}
              {reactionCountDisplay} {reactionCountDisplay === 1 ? "reaction" : "reactions"}
            </span>

            <span className="truncate text-right">
              {clamp0(commentsList.length)} comments · {clamp0(shareCount)} shares
            </span>
          </div>

          {/* Action bar */}
          <div className="px-3 py-2">
            <PostActionBar
              highlighted={hasHighlighted}
              highlightCount={highlightCount}
              commentCount={commentsList.length}
              viewCount={openedCount}
              onAdd={() => setShowReactions((value) => !value)}
              onHighlight={handleHighlight}
              onComment={scrollToDiscussion}
              onViews={() => {}}
              onShare={() => setShareModalOpen(true)}
              showCounts={true}
            />
          </div>

          {/* Reaction picker */}
          {showReactions && (
            <div className="mx-3 mb-2 flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl border border-[#dcebe1] bg-white p-2 shadow-[0_6px_20px_rgba(15,39,28,0.10)]">
              {reactionOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleReactionSelect(option.emoji)}
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

          {/* Top reaction + scroll hint */}
          <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-1">
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
              type="button"
              onClick={scrollToDiscussion}
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#168b45] transition active:text-[#0c6831]"
            >
              Scroll to see discussion
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* =======================================================
            DISCUSSION
        ======================================================== */}
        <div ref={discussionRef} className="scroll-mt-2 bg-white px-5 py-5 md:px-6">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9aa79f]">
              Comments ({commentsList.length}) · Replies ({totalReplyCount})
            </h3>

            {commentsList.length === 0 ? (
              <p className="py-4 text-sm text-[#9aa79f]">
                No comments yet
              </p>
            ) : (
              <div className="space-y-3">
                {commentsList.map((comment) => {
                  const commentId = String(comment._id ?? "");
                  const replyCount = countReplies(comment);
                  const isCommentLiked =
                    !!sessionUserId &&
                    Array.isArray(comment.likedBy) &&
                    comment.likedBy.includes(sessionUserId);

                  return (
                    <div key={commentId || `comment-${Math.random()}`} className="rounded-xl bg-[#f5f7f5] p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8efe8] text-xs font-semibold text-[#2f6b4f]">
                          {comment.userImage ? (
                            <img
                              src={comment.userImage}
                              alt={comment.userName || "User"}
                              className="h-full w-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/shadow.png"; }}
                            />
                          ) : (
                            <img src="/shadow.png" alt={comment.userName || "User"} className="h-full w-full object-cover" />
                          )}

                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#15271d]">
                            {comment.userName}
                          </p>

                          <p className="text-xs text-[#9aa79f]">
                            {formatRelativeTime(comment.createdAt)}
                          </p>
                        </div>
                      </div>

                      <p className="mt-2 text-sm leading-5 text-[#15271d]">
                        {comment.content}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#5b6b62]">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setCommentReactionMenuId(commentId === commentReactionMenuId ? null : commentId)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dfe9df] bg-white text-[#1c9d57] transition hover:bg-[#eaf6ee]"
                            aria-label="Add comment reaction"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.2} />
                          </button>

                          {commentReactionMenuId === commentId && (
                            <div className="absolute bottom-10 left-0 z-20 flex gap-2 rounded-full border border-[#e4ecdf] bg-white p-2 shadow-[0_10px_30px_rgba(15,39,28,0.12)]">
                              {reactionOptions.map((option) => (
                                <button
                                  key={option.label}
                                  type="button"
                                  onClick={() => handleCommentReaction(commentId)}
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
                          onClick={() => handleCommentReaction(commentId)}
                          className={`flex items-center gap-1 rounded-full px-2 py-1 font-medium ${
                            isCommentLiked ? "bg-[#fff1f3] text-[#df4059]" : "bg-white text-[#5b6b62]"
                          }`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${isCommentLiked ? "fill-current" : ""}`} />
                          {Number(comment.likes ?? 0)} reactions
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRepliesTarget(comment);
                            setRepliesModalOpen(true);
                          }}
                          className="rounded-full bg-white px-2 py-1 font-medium text-[#1c9d57]"
                        >
                          {replyCount} {replyCount === 1 ? "reply" : "replies"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReplyTarget({ commentId, userName: comment.userName || "this user" });
                            setReplyModalOpen(true);
                          }}
                          className="rounded-full bg-white px-2 py-1 font-medium text-[#1c9d57]"
                        >
                          Reply
                        </button>
                      </div>

                      {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                        <div className="mt-3 space-y-2 border-l border-[#dfe9df] pl-3">
                          {comment.replies.map((reply) => (
                            <div key={String(reply._id ?? `${commentId}-reply`)} className="rounded-lg bg-white/70 p-2">
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8efe8] text-[10px] font-semibold text-[#2f6b4f]">
                                  {reply.userImage ? (
                                    <img src={reply.userImage} alt={reply.userName || "User"} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/shadow.png"; }} />
                                  ) : (
                                    <img src="/shadow.png" alt={reply.userName || "User"} className="h-full w-full object-cover" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-[#15271d]">{reply.userName}</p>
                                  <p className="text-[10px] text-[#9aa79f]">{formatRelativeTime(reply.createdAt)}</p>
                                </div>
                              </div>
                              <p className="mt-1 text-xs leading-5 text-[#15271d]">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          FIXED COMMENT INPUT
          LIKE A BOTTOM NAVIGATION BAR
      ========================================================== */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dfe9e2] bg-white/95 px-3 py-3 backdrop-blur-md md:px-6">
        <form
          onSubmit={handleCommentSubmit}
          className="mx-auto flex w-full max-w-5xl items-center gap-2"
        >
          <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-[#dce8df] bg-[#f7faf8] px-4 focus-within:border-[#1c9d57] focus-within:ring-2 focus-within:ring-[#1c9d57]/20">
            <input
              type="text"
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder={
                sessionUserId
                  ? "Write a comment..."
                  : "Sign in to comment..."
              }
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#15271d] outline-none placeholder:text-[#9aa79f]"
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
            className="shrink-0 rounded-2xl bg-[#1c9d57] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#138647] disabled:cursor-not-allowed disabled:bg-[#9aa79f]"
          >
            {isSubmittingComment ? "..." : "Post"}
          </button>
        </form>
      </div>

      {replyModalOpen && replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#15271d]">
                Reply to {replyTarget.userName}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setReplyModalOpen(false);
                  setReplyTarget(null);
                  setReplyText("");
                }}
                className="rounded-full bg-[#f1f5f2] px-2 py-1 text-xs text-[#5f7073]"
              >
                Close
              </button>
            </div>

            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              rows={4}
              placeholder="Write a reply..."
              className="w-full rounded-2xl border border-[#dfe9df] bg-[#f8faf8] px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#7b867d]"
            />

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplyModalOpen(false);
                  setReplyTarget(null);
                  setReplyText("");
                }}
                className="rounded-full border border-[#dfe9df] px-3 py-1.5 text-sm text-[#1d2c23]"
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