"use client";

import {
  Heart,
  MessageCircle,
  Plus,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "./app-shell";
import { ReplyModal } from "./reply-modal";
import { useModalHistory } from "./use-modal-history";
import { createClientNotification } from "@/lib/notifications-client";

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
  likedBy?: string[];
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

export function PostDetailModal({
  post,
  onClose,
  sessionUserId,
}: {
  post: FeedPost;
  onClose: () => void;
  sessionUserId: string | null;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [likeCount, setLikeCount] = useState(post.likes ?? 0);
  const [shareCount, setShareCount] = useState(post.shares ?? 0);
  const [hasLiked, setHasLiked] = useState(
    Array.isArray(post.likedBy) && sessionUserId
      ? post.likedBy.includes(sessionUserId)
      : false
  );
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

  useModalHistory(onClose);

  const imageList = post.images || [];
  const totalImages = imageList.length;

  const totalReplyCount = commentsList.reduce(
    (sum, comment) => sum + countReplies(comment),
    0
  );

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleLike() {
    const previousLiked = hasLiked;
    const previousCount = likeCount;

    setHasLiked(!hasLiked);
    setLikeCount(!hasLiked ? likeCount + 1 : likeCount - 1);

    try {
      const response = await fetch(`/api/posts/${post._id ?? post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like" }),
      });

      if (!response.ok) {
        setHasLiked(previousLiked);
        setLikeCount(previousCount);
      }
    } catch (error) {
      console.error("Failed to like post:", error);
      setHasLiked(previousLiked);
      setLikeCount(previousCount);
    }
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
            senderId: sessionUserId,
            receiverId: post.userId,
            creatorId: post.userId,
            actorId: sessionUserId,
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
          senderId: sessionUserId,
          receiverId: target.userId,
          creatorId: post.userId || target.userId,
          actorId: sessionUserId,
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
    setCurrentImageIndex((prev) => (prev + 1) % totalImages);
  }

  function prevImage() {
    setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
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
            />
          ) : (
            <span>
              {(post.userName || "U").slice(0, 2).toUpperCase()}
            </span>
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
      </div>

      {/* =========================================================
          MAIN SCROLL AREA
      ========================================================== */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-21.5">
        {/* =======================================================
            DESCRIPTION
        ======================================================== */}
        {post.content?.trim() ? (
          <div className="shrink-0 border-b border-[#e3ebe6] bg-white px-5 py-4 md:px-6">
            <p className="whitespace-pre-wrap text-[16px] font-medium leading-7 text-[#15271d]">
              {post.content}
            </p>
          </div>
        ) : null}

        {/* =======================================================
            IMAGE
        ======================================================== */}
        {totalImages > 0 && (
          <div className="relative shrink-0 bg-black">
            <img
              src={imageList[currentImageIndex]}
              alt={`Post image ${currentImageIndex + 1}`}
              className="block h-[52dvh] w-full object-contain md:h-[60dvh]"
            />

            {/* IMAGE COUNTER */}
            {totalImages > 1 && (
              <>
                <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
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
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/55"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>

                {/* NEXT */}
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/55"
                  aria-label="Next image"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
        )}

        {/* =======================================================
            LIKE / COMMENT / SHARE
            DIRECTLY UNDER IMAGE
        ======================================================== */}
        <div className="shrink-0 border-b border-[#e3ebe6] bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            {/* LIKE */}
            <button
              onClick={handleLike}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f2f6f3] py-3 text-sm font-semibold text-[#15271d] transition hover:bg-[#e5f1e8]"
            >
              <Heart
                size={18}
                className={
                  hasLiked ? "fill-red-500 text-red-500" : ""
                }
              />

              <span>{hasLiked ? "Unlike" : "Like"}</span>

              <span className="text-[#718077]">
                {likeCount}
              </span>
            </button>

            {/* COMMENT */}
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f2f6f3] py-3 text-sm font-semibold text-[#15271d] transition hover:bg-[#e5f1e8]"
            >
              <MessageCircle size={18} />

              <span>Comment</span>

              <span className="text-[#718077]">
                {commentsList.length}
              </span>
            </button>

            {/* SHARE */}
            <button
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f2f6f3] py-3 text-sm font-semibold text-[#15271d] transition hover:bg-[#e5f1e8]"
            >
              <Send size={18} />

              <span>Share</span>

              <span className="text-[#718077]">
                {shareCount}
              </span>
            </button>
          </div>
        </div>

        <div className="bg-white px-5 py-5 md:px-6">
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
                            />
                          ) : (
                            <span>
                              {(comment.userName || "U")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
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
                                    <img src={reply.userImage} alt={reply.userName || "User"} className="h-full w-full object-cover" />
                                  ) : (
                                    <span>{(reply.userName || "U").slice(0, 2).toUpperCase()}</span>
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
    </div>
  );
}