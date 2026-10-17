"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { ImageGallery } from "@/components/netizen/image-gallery";

type PostComment = {
  _id?: string;
  userId?: string;
  userName?: string | null;
  userImage?: string | null;
  content?: string;
  createdAt?: string | Date;
};

type PostRecord = {
  id?: string;
  _id?: string;
  content: string;
  images?: string[] | null;
  userId?: string;
  userName?: string | null;
  userImage?: string | null;
  likes?: number;
  comments?: number;
  shares?: number;
  likedBy?: string[];
  opened?: string[];
  commentsList?: PostComment[];
  createdAt?: string | Date;
};

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

export default function PostDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const rawId = params?.id;
  const postId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [post, setPost] = useState<PostRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [optimisticLikes, setOptimisticLikes] = useState<{
    count: number;
    isLiked: boolean;
  } | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/get-session", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          setSessionUserId(null);
          return;
        }

        const data = await response.json();
        setSessionUserId(data?.user?.id ?? null);
      } catch (err) {
        console.error("Failed to get session:", err);
        setSessionUserId(null);
      }
    }

    loadSession();
  }, []);

  useEffect(() => {
    if (!postId) {
      setLoading(false);
      setError("No post id provided.");
      return;
    }

    async function loadPost() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/posts/${postId}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data?.post) {
          throw new Error(data?.message || "Unable to load this post.");
        }

        setPost(data.post);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load this post.");
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [postId]);

  async function updatePostCount(action: "like" | "comment" | "share", payload?: { comment?: string }) {
    if (!postId || !post) return;

    if (action !== "share" && !sessionUserId) {
      setError("Please sign in to interact with posts.");
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(payload ?? {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to update this post.");
      }

      setPost((current) => (current ? { ...current, ...data.post } : current));
      setError("");

      if (action === "comment") {
        setCommentText("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update this post.");
    }
  }

  async function handleLike() {
    if (!postId || !post) return;

    if (!sessionUserId) {
      setError("Please sign in to like posts.");
      return;
    }

    const currentLikeState = optimisticLikes || {
      count: post.likes ?? 0,
      isLiked: Boolean(sessionUserId && Array.isArray(post.likedBy) && post.likedBy.includes(sessionUserId)),
    };

    const nextIsLiked = !currentLikeState.isLiked;
    const nextCount = nextIsLiked ? currentLikeState.count + 1 : currentLikeState.count - 1;

    // Optimistic update
    setOptimisticLikes({
      count: nextCount,
      isLiked: nextIsLiked,
    });

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like" }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert on error
        setOptimisticLikes(null);
        throw new Error(data?.message || "Unable to update like");
      }

      // Update with server response
      const likedBy = Array.isArray(data?.post?.likedBy) ? data.post.likedBy : post.likedBy ?? [];
      const likes = typeof data?.post?.likes === "number" ? data.post.likes : nextCount;

      setPost((current) => (current ? { ...current, likedBy, likes } : current));
      setOptimisticLikes(null);
      setError("");
    } catch (err) {
      console.error("Like failed:", err);
      setError(err instanceof Error ? err.message : "Unable to update like");
    }
  }

  async function handleComment() {
    const trimmed = commentText.trim();

    if (!trimmed) {
      setError("Please write a comment first.");
      return;
    }

    if (!sessionUserId) {
      setError("Please sign in to comment.");
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", comment: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to post comment.");
      }

      // Update post with new comment from server
      setPost((current) =>
        current
          ? {
              ...current,
              comments: (current.comments ?? 0) + 1,
              commentsList: [...(current.commentsList ?? []), data.comment],
            }
          : current,
      );
      setCommentText("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post comment.");
    }
  }

  async function handleShare() {
    if (!postId) return;
    const shareUrl = `${window.location.origin}/posts/${postId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Netizen post",
          text: post?.content || "Check out this post",
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (err) {
      console.warn("Share cancelled or unavailable:", err);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl).catch(() => undefined);
      }
    }

    await updatePostCount("share");
  }

  useEffect(() => {
    if (!postId) return;

    async function recordView() {
      try {
        await fetch(`/api/posts/${postId}/view`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Failed to record post view:", err);
      }
    }

    recordView();
  }, [postId]);

  const imageList = Array.isArray(post?.images)
    ? post.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    : [];
  
  const displayLikes = optimisticLikes?.count ?? (post?.likes ?? 0);
  const displayIsLiked = optimisticLikes?.isLiked ?? Boolean(
    sessionUserId && Array.isArray(post?.likedBy) && post.likedBy.includes(sessionUserId),
  );

  const commentsList = Array.isArray(post?.commentsList) ? post.commentsList : [];

  return (
    <main className="min-h-screen bg-[#f4f7f4] px-4 py-6 text-[#122219]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#dbe7dd] bg-white px-3 py-2 text-sm font-medium text-[#1a352d] shadow-sm transition hover:bg-[#edf4ee]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to feed
          </Link>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-[#ecf0ec] bg-white p-6 text-sm text-[#5b6b62]">
            Loading post...
          </div>
        ) : error ? (
          <div className="rounded-[24px] border border-[#f3d7d0] bg-[#fff4f1] p-6 text-sm text-[#7f362f]">
            {error}
          </div>
        ) : post ? (
          <article className="overflow-hidden rounded-[28px] border border-[#ecf0ec] bg-white shadow-[0_10px_26px_rgba(17,34,26,0.06)]">
            <div className="border-b border-[#edf3ee] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#e8efe8] text-sm font-semibold text-[#2f6b4f]">
                  {post.userImage ? (
                    <img src={post.userImage} alt={post.userName || "User"} className="h-full w-full object-cover" />
                  ) : (
                    <span>{(post.userName || "U").slice(0, 2).toUpperCase()}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-[#111827]">
                    {post.userName || "Unknown user"}
                  </div>
                  <div className="mt-1 text-sm text-[#5b6b62]">
                    @{(post.userName || "user").toLowerCase().replace(/\s+/g, ".")} · {formatRelativeTime(post.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="whitespace-pre-wrap text-[17px] leading-8 text-[#111827]">{post.content}</p>

              {imageList.length > 0 && <ImageGallery images={imageList} />}

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#edf3ee] pt-4 text-sm text-[#5b6d62]">
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-full px-2 py-1 ${displayIsLiked ? "bg-[#fff1f0] text-[#c14b4b]" : ""}`}
                  onClick={handleLike}
                >
                  <Heart className={`h-4 w-4 ${displayIsLiked ? "fill-current" : ""}`} />
                  <span>{displayLikes}</span>
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-full px-2 py-1">
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.comments ?? 0}</span>
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-full px-2 py-1" onClick={handleShare}>
                  <Send className="h-4 w-4" />
                  <span>{post.shares ?? 0}</span>
                </button>
              </div>

              <div className="mt-6 rounded-[20px] border border-[#edf2ee] bg-[#f7faf7] p-4">
                {commentsList.length > 0 ? (
                  <div className="mb-4">
                    <h3 className="mb-4 text-sm font-semibold text-[#1c3128]">
                      Comments ({commentsList.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {commentsList.map((comment) => (
                        <div key={comment._id || Math.random()} className="flex gap-3 rounded-xl bg-white p-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8efe8] text-xs font-semibold text-[#2f6b4f]">
                            {comment.userImage ? (
                              <img src={comment.userImage} alt={comment.userName || "User"} className="h-full w-full object-cover" />
                            ) : (
                              <span>{(comment.userName || "U").slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-[#111827]">{comment.userName || "Unknown user"}</div>
                            <div className="mt-0.5 text-xs text-[#5b6b62]">{formatRelativeTime(comment.createdAt)}</div>
                            <div className="mt-1 text-sm text-[#111827]">{comment.content || ""}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-[#5b6b62]">No comments yet. Be the first to comment!</p>
                )}
              </div>

              <div className="mt-6 rounded-[20px] border border-[#edf2ee] bg-[#f7faf7] p-4">
                <label htmlFor="comment" className="mb-2 block text-sm font-medium text-[#1c3128]">
                  Add a comment
                </label>
                <textarea
                  id="comment"
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  rows={3}
                  placeholder="Share your thoughts..."
                  className="w-full rounded-xl border border-[#dfe9df] bg-white px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#7b867d]"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleComment}
                    className="rounded-full bg-[#2f6b4f] px-4 py-2 text-sm font-medium text-white"
                  >
                    Post comment
                  </button>
                </div>
              </div>
            </div>
          </article>
        ) : (
          <div className="rounded-[24px] border border-[#ecf0ec] bg-white p-6 text-sm text-[#5b6b62]">
            Post not found.
          </div>
        )}
      </div>
    </main>
  );
}
