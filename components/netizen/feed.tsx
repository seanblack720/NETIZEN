"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { groups } from "@/lib/netizen-data";
import { Avatar } from "./app-shell";
import { PostDetailModal } from "./post-detail-modal";
import { PostCard } from "./post-card";
import { createClientNotification } from "@/lib/notifications-client";

function clamp(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

export type FeedPost = {
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
  likedBy?: string[]; // legacy
  highlightedBy?: string[];
  scrolled?: string[];
  scrolledAt?: Record<string, string>;
  opened?: string[];
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
  createdAt?: string | Date;
};

export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className ?? ""}>
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="m-0 text-sm tracking-wide text-slate-500">{title}</h2>
        {action && (
          <button className="border-0 bg-transparent text-sm font-bold text-emerald-700">{action}</button>
        )}
      </div>
      {children}
    </section>
  );
}

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

type StatusItem = {
  id?: string;
  _id?: string;
  image?: string;
  title?: string;
  tag?: string;
  userName?: string;
};

export function Feed({
  refreshKey,
  onNavigate,
  onCreate,
  onOpenProfile,
  incomingPost,
}: {
  refreshKey?: number | string;
  onNavigate?: (id: import("@/lib/netizen-data").NavId) => void;
  onCreate?: () => void;
  onOpenProfile?: (userId: string, userName?: string | null, userImage?: string | null) => void;
  incomingPost?: FeedPost | null;
} = {}) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusImage, setStatusImage] = useState("");
  const [statusTitle, setStatusTitle] = useState("");
  const [statusTag, setStatusTag] = useState("Update");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [postLikes, setPostLikes] = useState<Record<string, { likes: number; hasLiked: boolean }>>({});
  const [postHighlights, setPostHighlights] = useState<Record<string, { highlightCount: number; highlighted: boolean }>>({});
  const scrolledSentRef = React.useRef<Set<string>>(new Set());

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
        console.error("Failed to load session for feed:", err);
        setSessionUserId(null);
      } finally {
        setSessionResolved(true);
      }
    }

    async function loadPosts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/posts", {
          cache: "no-store",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load posts");
        }

        setPosts(Array.isArray(data.posts) ? data.posts : []);
      } catch (err) {
        console.error("Failed to load posts:", err);
        setError(err instanceof Error ? err.message : "Failed to load posts");
      } finally {
        setLoading(false);
      }
    }

    async function loadStatuses() {
      try {
        const response = await fetch("/api/statuses", {
          cache: "no-store",
        });

        const data = await response.json();

        if (response.ok && data.statuses) {
          setStatuses(data.statuses);
        }
      } catch (err) {
        console.error("Failed to load statuses:", err);
      }
    }

    loadSession();
    loadPosts();
    loadStatuses();
  }, [refreshKey]);

  useEffect(() => {
    if (incomingPost) {
      prependPost(incomingPost);
    }
  }, [incomingPost]);

  function getPostId(post: FeedPost) {
    return String(post.id ?? post._id ?? "");
  }

  function updatePost(postId: string, nextPost: Partial<FeedPost>) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        const currentId = getPostId(post);
        return currentId === postId ? { ...post, ...nextPost } : post;
      }),
    );
  }

  function syncPostFromInteraction(postId: string, updater: (post: FeedPost) => FeedPost) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        const currentId = getPostId(post);
        return currentId === postId ? updater(post) : post;
      }),
    );
  }

  function prependPost(newPost: FeedPost) {
    setPosts((currentPosts) => {
      const hb = Array.isArray((newPost as any).highlightedBy)
        ? (newPost as any).highlightedBy
        : Array.isArray(newPost.highlightedByUser)
          ? newPost.highlightedByUser!
          : Array.isArray(newPost.likedBy)
            ? newPost.likedBy
            : [];
      const reactions = (newPost as any).reactions && typeof (newPost as any).reactions === "object" && !Array.isArray((newPost as any).reactions) ? (newPost as any).reactions : {};
      const normalized = {
        ...newPost,
        likes: Number(newPost.likes ?? 0),
        comments: Number(newPost.comments ?? 0),
        shares: Number(newPost.shares ?? 0),
        likedBy: Array.isArray(newPost.likedBy) ? newPost.likedBy : hb,
        highlightedBy: hb,
        highlightedByUser: hb,
        highlightCount: typeof newPost.highlightCount === "number" ? newPost.highlightCount : hb.length,
        reactions,
        images: Array.isArray(newPost.images) ? newPost.images : [],
      };

      const existing = currentPosts.some((post) => getPostId(post) === getPostId(normalized));
      if (existing) return currentPosts;

      return [normalized, ...currentPosts];
    });
  }

  function applyCommentUpdate(postId: string, commentText: string) {
    const optimisticComment = {
      _id: `optimistic-${Date.now()}`,
      userId: sessionUserId ?? "me",
      userName: "You",
      userImage: null,
      content: commentText,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      replies: [],
    };

    syncPostFromInteraction(postId, (post) => ({
      ...post,
      comments: Number(post.comments ?? 0) + 1,
      commentsList: Array.isArray((post as any).commentsList)
        ? [...(post as any).commentsList, optimisticComment]
        : [optimisticComment],
    }));
  }

  function applyReplyUpdate(postId: string, commentId: string, replyText: string) {
    syncPostFromInteraction(postId, (post) => {
      const list = Array.isArray((post as any).commentsList) ? (post as any).commentsList : [];
      const nextList = list.map((comment: any) => {
        if (String(comment._id) !== String(commentId)) return comment;

        const reply = {
          _id: `optimistic-reply-${Date.now()}`,
          userId: sessionUserId ?? "me",
          userName: "You",
          userImage: null,
          content: replyText,
          createdAt: new Date().toISOString(),
          likes: 0,
          likedBy: [],
          replies: [],
        };

        return {
          ...comment,
          replies: Array.isArray(comment.replies) ? [...comment.replies, reply] : [reply],
        };
      });

      return {
        ...post,
        commentsList: nextList,
      };
    });
  }

  function applyCommentLikeUpdate(postId: string, commentId: string) {
    syncPostFromInteraction(postId, (post) => {
      const list = Array.isArray((post as any).commentsList) ? (post as any).commentsList : [];
      const nextList = list.map((comment: any) => {
        if (String(comment._id) !== String(commentId)) return comment;
        const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
        const hasLiked = !!sessionUserId && likedBy.includes(sessionUserId);
        return {
          ...comment,
          likes: Math.max(0, Number(comment.likes ?? 0) + (hasLiked ? -1 : 1)),
          likedBy: hasLiked
            ? likedBy.filter((id: string) => id !== sessionUserId)
            : [...new Set([...likedBy, sessionUserId ?? "me"])],
        };
      });

      return { ...post, commentsList: nextList };
    });
  }

  function applyReplyLikeUpdate(postId: string, commentId: string, replyId: string) {
    syncPostFromInteraction(postId, (post) => {
      const list = Array.isArray((post as any).commentsList) ? (post as any).commentsList : [];
      const nextList = list.map((comment: any) => {
        if (String(comment._id) !== String(commentId)) return comment;

        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        const nextReplies = replies.map((reply: any) => {
          if (String(reply._id) !== String(replyId)) return reply;
          const likedBy = Array.isArray(reply.likedBy) ? reply.likedBy : [];
          const hasLiked = !!sessionUserId && likedBy.includes(sessionUserId);
          return {
            ...reply,
            likes: Math.max(0, Number(reply.likes ?? 0) + (hasLiked ? -1 : 1)),
            likedBy: hasLiked
              ? likedBy.filter((id: string) => id !== sessionUserId)
              : [...new Set([...likedBy, sessionUserId ?? "me"])],
          };
        });

        return { ...comment, replies: nextReplies };
      });

      return { ...post, commentsList: nextList };
    });
  }

  useEffect(() => {
    if (!sessionUserId) return;

    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        const postId = getPostId(post);
        const hbArr: string[] = Array.isArray((post as any).highlightedBy)
          ? (post as any).highlightedBy
          : Array.isArray(post.highlightedByUser)
            ? post.highlightedByUser!
            : Array.isArray(post.likedBy)
              ? post.likedBy
              : [];
        const postLikeState = postLikes[postId];

        if (!postLikeState) return post;

        return {
          ...post,
          likes: clamp(postLikeState.likes),
          highlightedBy: postLikeState.hasLiked ? [...new Set([...hbArr, sessionUserId])] : hbArr.filter((id) => id !== sessionUserId),
          highlightedByUser: postLikeState.hasLiked ? [...new Set([...hbArr, sessionUserId])] : hbArr.filter((id) => id !== sessionUserId),
          likedBy: postLikeState.hasLiked ? [...new Set([...hbArr, sessionUserId])] : hbArr.filter((id) => id !== sessionUserId),
          highlightCount: clamp(postLikeState.likes),
        } as any;
      }),
    );
  }, [postLikes, sessionUserId]);

  async function handleLike(post: FeedPost) {
    const postId = getPostId(post);

    if (!postId) return;

    if (!sessionUserId) {
      setError("Please sign in to like posts.");
      return;
    }

    const hbArr: string[] = Array.isArray((post as any).highlightedBy)
      ? (post as any).highlightedBy
      : Array.isArray(post.highlightedByUser)
        ? post.highlightedByUser!
        : Array.isArray(post.likedBy)
          ? post.likedBy
          : [];
    const wasLiked = postLikes[postId]?.hasLiked ?? hbArr.includes(sessionUserId) ?? false;
    const currentLikes = clamp(postLikes[postId]?.likes ?? post.highlightCount ?? post.likes ?? hbArr.length);

    setPostLikes((prev) => ({
      ...prev,
      [postId]: {
        likes: clamp(wasLiked ? currentLikes - 1 : currentLikes + 1),
        hasLiked: !wasLiked,
      },
    }));

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "highlight" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to update like");
      }

      const serverHb: string[] = Array.isArray(data?.post?.highlightedBy)
        ? data.post.highlightedBy
        : Array.isArray(data?.post?.highlightedByUser)
          ? data.post.highlightedByUser
          : Array.isArray(data?.post?.likedBy)
            ? data.post.likedBy
            : hbArr;
      const likes = typeof data?.post?.highlightCount === "number" ? clamp(data.post.highlightCount) : typeof data?.post?.likes === "number" ? clamp(data.post.likes) : clamp(serverHb.length);
      const likedBy = serverHb;

      if (!wasLiked && post.userId && post.userId !== sessionUserId) {
        await createClientNotification({
          actorId: sessionUserId,
          receiverId: post.userId,
          creatorId: post.userId,
          actorName: "You",
          type: "post-reaction",
          postId: String(postId),
          message: "You reacted to their post",
          link: `/posts/${String(postId)}`,
        });
      }

      updatePost(postId, { likedBy, likes, highlightedBy: likedBy, highlightedByUser: likedBy, highlightCount: likes } as any);
      setPostLikes((prev) => ({
        ...prev,
        [postId]: { likes: clamp(likes), hasLiked: likedBy.includes(sessionUserId) },
      }));
      setError("");
    } catch (err) {
      console.error("Like failed:", err);
      setPostLikes((prev) => ({
        ...prev,
        [postId]: { likes: clamp(currentLikes), hasLiked: wasLiked },
      }));
      setError(err instanceof Error ? err.message : "Unable to update like");
    }
  }

  async function handleHighlight(post: FeedPost) {
    const postId = getPostId(post);
    if (!postId) return;
    if (!sessionUserId) {
      setError("Please sign in to highlight posts.");
      return;
    }
    const hb: string[] = Array.isArray((post as any).highlightedBy)
      ? (post as any).highlightedBy
      : Array.isArray(post.highlightedByUser)
        ? post.highlightedByUser
        : Array.isArray(post.likedBy)
          ? post.likedBy
          : [];
    const wasHighlighted = hb.includes(sessionUserId);
    const currentHighlights = clamp(post.highlightCount ?? hb.length);

    setPostHighlights((prev) => ({
      ...prev,
      [postId]: {
        highlightCount: clamp(wasHighlighted ? currentHighlights - 1 : currentHighlights + 1),
        highlighted: !wasHighlighted,
      },
    }));

    try {
      const response = await fetch(`/api/posts/${postId}/highlight`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ highlighted: !wasHighlighted }),
      });

      if (!response.ok) throw new Error("Unable to update highlight");
      const data = await response.json().catch(() => ({}));
      const serverCount = typeof data?.highlightCount === "number" ? clamp(data.highlightCount) : clamp(!wasHighlighted ? currentHighlights + 1 : currentHighlights - 1);
      const serverHighlighted = typeof data?.highlighted === "boolean" ? data.highlighted : !wasHighlighted;
      updatePost(postId, {
        highlightCount: serverCount,
        highlightedBy: serverHighlighted
          ? [...new Set([...hb, sessionUserId])]
          : hb.filter((id) => id !== sessionUserId),
        highlightedByUser: serverHighlighted
          ? [...new Set([...hb, sessionUserId])]
          : hb.filter((id) => id !== sessionUserId),
      } as any);
      setPostHighlights((prev) => ({
        ...prev,
        [postId]: { highlightCount: serverCount, highlighted: serverHighlighted },
      }));
      setError("");
    } catch (err) {
      console.error("Highlight failed:", err);
      setPostHighlights((prev) => ({
        ...prev,
        [postId]: { highlightCount: currentHighlights, highlighted: wasHighlighted },
      }));
      setError(err instanceof Error ? err.message : "Unable to highlight post");
    }
  }

  async function handleComment(post: FeedPost) {
    const postId = getPostId(post);
    const draft = (commentDrafts[postId] ?? "").trim();

    if (!postId || !draft) return;

    if (!sessionUserId) {
      setError("Please sign in to comment on posts.");
      return;
    }

    if (draft.length > 4000) {
      setError("Comment is too long (max 4000 characters)");
      return;
    }

    // Optimistic update – tracked so we can roll back on failure (no full-page refresh)
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticComment = {
      _id: optimisticId,
      userId: sessionUserId ?? "me",
      userName: "You",
      userImage: null,
      content: draft,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      replies: [],
    };
    syncPostFromInteraction(postId, (p) => ({
      ...p,
      comments: Number(p.comments ?? 0) + 1,
      commentsList: Array.isArray((p as any).commentsList) ? [...(p as any).commentsList, optimisticComment] : [optimisticComment],
    }));

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", comment: draft }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to post comment");
      }

      // Reconcile with server truth – replace optimistic list with canonical one
      if (Array.isArray(data?.post?.commentsList)) {
        updatePost(postId, { commentsList: data.post.commentsList, comments: Number(data.post.comments ?? 0) } as any);
      } else {
        const comments = typeof data?.post?.comments === "number" ? data.post.comments : post.comments ?? 0;
        // remove optimistic and keep server count
        syncPostFromInteraction(postId, (p) => {
          const list = Array.isArray((p as any).commentsList) ? (p as any).commentsList.filter((c: any) => String(c._id) !== optimisticId) : [];
          return { ...p, comments, commentsList: list } as any;
        });
        updatePost(postId, { comments });
      }
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      setCommentingId(null);
      setError("");
    } catch (err) {
      // Roll back optimistic comment on failure
      syncPostFromInteraction(postId, (p) => {
        const list = Array.isArray((p as any).commentsList) ? (p as any).commentsList.filter((c: any) => String(c._id) !== optimisticId) : [];
        return { ...p, comments: Math.max(0, Number(p.comments ?? 1) - 1), commentsList: list } as any;
      });
      console.error("Comment failed:", err);
      setError(err instanceof Error ? err.message : "Unable to post comment");
    }
  }

  async function handleShare(post: FeedPost) {
    const postId = getPostId(post);

    if (!postId) return;

    const shareUrl = `${window.location.origin}/posts/${postId}`;

    // Optimistic increment – correct state, no full-page refresh, server reconciles
    const previousShares = clamp(post.shares ?? 0);
    updatePost(postId, { shares: clamp(previousShares + 1) });

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Netizen post",
          text: post.content || "Check out this post",
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (err) {
      console.warn("Share attempt failed, still retrying with clipboard fallback:", err);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl).catch(() => undefined);
      }
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to share post");
      }

      // Reconcile with DB truth – prevents duplicate increments from race conditions
      const shares = typeof data?.post?.shares === "number" ? clamp(data.post.shares) : clamp(previousShares + 1);
      updatePost(postId, { shares });
      setError("");
    } catch (err) {
      // rollback optimistic share on failure
      updatePost(postId, { shares: previousShares });
      console.error("Share failed:", err);
      setError(err instanceof Error ? err.message : "Unable to share post");
    }
  }

  async function handleReshare(post: FeedPost) {
    const postId = getPostId(post);

    if (!postId || !sessionUserId) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reshare" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to reshare post");
      }

      // Add the reshared post to the feed
      if (data?.post) {
        prependPost(data.post);
      }
      setError("");
    } catch (err) {
      console.error("Reshare failed:", err);
      setError(err instanceof Error ? err.message : "Unable to reshare post");
    }
  }

  function handleStatusImageChange(file?: File) {
    setStatusError("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusError("Please choose an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setStatusImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function handleCreateStatus() {
    if (!statusImage) {
      setStatusError("Add an image for your status.");
      return;
    }

    setStatusSaving(true);
    setStatusError("");

    try {
      const response = await fetch("/api/statuses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: statusImage,
          title: statusTitle,
          tag: statusTag,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to create status");
      }

      setStatuses((current) => [data.status, ...current]);
      setStatusImage("");
      setStatusTitle("");
      setStatusTag("Update");
      setStatusModalOpen(false);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Unable to create status");
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[880px] px-2 sm:px-4">
      {error && (
        <div className="mb-4 rounded-2xl border border-[#f3d7d0] bg-[#fff4f1] px-3 py-2 text-sm text-[#7f362f] transition-all duration-300">
          {error}
        </div>
      )}

      {sessionResolved && !sessionUserId && (
        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-[#cfe8d8] bg-[#f1faf4] px-4 py-3 text-sm text-[#28573d] sm:flex-row sm:items-center sm:justify-between">
          <span>You are not logged in. You can browse the feed, but sign in to post, like, or comment.</span>
          <Link href="/login" className="shrink-0 font-semibold text-[#07843b] underline underline-offset-2">
            Log in
          </Link>
        </div>
      )}

      <Section title="ADDED NETIZENS STATUS" className="mt-0 sm:mt-6">
        <div
          className="mx-2 flex gap-2.5 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-4
                     snap-x snap-proximity scroll-px-7 sm:scroll-px-9
                     [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            onClick={() => {
              if (!sessionUserId) {
                setError("Please sign in to add a status.");
                return;
              }
              setStatusModalOpen(true);
            }}
            className="flex h-[184px] w-[132px] shrink-0 snap-start flex-col items-center justify-center gap-2
                       rounded-[17px] border-2 border-dashed border-[#b9d9c6] bg-[#f1faf4] text-[#168b45]
                       transition hover:bg-[#e7f7ed] active:scale-95 first:ml-auto sm:h-[210px] sm:w-[150px]"
            aria-label="Add status"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#1c9d57] text-white">
              <Plus className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold">Add status</span>
          </button>

          {statuses.map((status) => (
            <button
              key={status.id || status._id}
              className="relative h-[184px] w-[132px] shrink-0 snap-start overflow-hidden rounded-[17px]
                         border-0 bg-[#20342d] p-0 text-left text-white last:mr-auto sm:h-[210px] sm:w-[150px]"
              onClick={() => onNavigate?.("feed")}
            >
              <img
                src={status.image}
                alt={status.title || "Status"}
                className="h-full w-full object-cover brightness-[0.75]"
              />
              <div className="absolute inset-x-0 bottom-0 top-[45%] bg-gradient-to-b from-transparent to-black/80" />
              <span className="absolute left-2 top-2 z-10 rounded-[18px] bg-emerald-500 px-2 py-1 text-xs font-semibold">
                {status.tag || "Update"}
              </span>
              <strong className="absolute bottom-3 left-3 right-3 z-10 text-sm leading-tight">
                {status.title || "Status"}
              </strong>
            </button>
          ))}

          {statuses.length === 0 && (
            <div
              className="flex h-[184px] w-[160px] shrink-0 items-center rounded-[17px] border border-[#e5ece7]
                         bg-white px-4 text-xs text-[#68776f] last:mr-auto sm:h-[210px]"
            >
              No statuses yet — be the first to post one.
            </div>
          )}
        </div>
      </Section>

      <Section title="GROUPS" action="See all" className="mt-2 sm:mt-4">
        <div
          className="mx-2 flex gap-2.5 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-4
                     snap-x snap-proximity scroll-px-7 sm:scroll-px-9
                     [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {groups.map((group) => (
            <button
              key={group.name}
              onClick={() => onNavigate?.("groups")}
              className="flex w-[300px] shrink-0 snap-start items-center gap-3 rounded-[17px] border border-gray-200
                         bg-white p-3.5 text-left shadow-[0_3px_12px_rgba(25,58,45,0.03)]
                         first:ml-auto last:mr-auto sm:w-[340px]"
            >
              <Avatar
                src={group.image}
                alt={group.name}
                className="h-[58px] w-[58px] shrink-0 rounded-[14px] object-cover"
              />

              <div className="min-w-0 flex-1">
                <b className="block truncate text-base">{group.name}</b>
                <span className="mt-1 block text-sm text-slate-500">{group.members}</span>
              </div>

              <div className="flex shrink-0 items-center pl-2">
                <Avatar src={null} alt="Member one" className="h-7 w-7 rounded-full border-2 border-white object-cover" />
                <Avatar src={null} alt="Member two" className="-ml-2 h-7 w-7 rounded-full border-2 border-white object-cover" />
                <Avatar src={null} alt="Member three" className="-ml-2 h-7 w-7 rounded-full border-2 border-white object-cover" />
                <i className="-ml-2 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-emerald-100 text-[11px] font-bold not-italic text-emerald-700">
                  {group.more}
                </i>
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="RECENT POSTS" className="mt-3 sm:mt-6">
        {loading ? (
          <div className="mx-3 rounded-2xl border border-[#edf3ee] bg-white p-5 text-sm text-[#5b6b62]">Loading posts…</div>
        ) : error ? (
          <div className="mx-3 rounded-2xl border border-[#f3d7d0] bg-[#fff4f1] p-5 text-sm text-[#7f362f]">
            <span>{error}</span>{" "}
            <button
              type="button"
              onClick={() => {
                setError("");
                setLoading(true);
                fetch("/api/posts", { cache: "no-store", credentials: "include", headers: { "Content-Type": "application/json" } })
                  .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
                  .then(({ ok, d }) => {
                    if (!ok) throw new Error(d?.message || "Failed to load posts");
                    setPosts(Array.isArray(d.posts) ? d.posts : []);
                  })
                  .catch((e) => setError(e instanceof Error ? e.message : "Failed to load posts"))
                  .finally(() => setLoading(false));
              }}
              className="font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="mx-3 rounded-2xl border border-[#edf3ee] bg-white p-5 text-center text-sm text-[#5b6b62]">No posts yet — be the first to share something.</div>
        ) : (
          <div className="px-4 flex flex-col gap-1">
            {posts.map((post) => {
              const postId = getPostId(post);
              // fire-and-forget scrolled tracking – set semantics so algorithm knows user saw it
              if (
                sessionUserId &&
                postId &&
                !(Array.isArray((post as any).scrolled) && (post as any).scrolled.includes(sessionUserId)) &&
                !scrolledSentRef.current.has(postId)
              ) {
                scrolledSentRef.current.add(postId);
                fetch(`/api/posts/${postId}`, {
                  method: "PATCH",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "scrolled" }),
                }).catch(() => {});
              }
              const imageList = Array.isArray(post.images)
                ? post.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
                : [];
              const legacyHb: string[] = Array.isArray((post as any).highlightedBy)
                ? (post as any).highlightedBy
                : Array.isArray(post.highlightedByUser)
                  ? post.highlightedByUser!
                  : Array.isArray((post as any).likedBy)
                    ? (post as any).likedBy
                    : [];
              const isLiked = Boolean(sessionUserId && legacyHb.includes(sessionUserId));
              const isHighlighted = Boolean(sessionUserId && legacyHb.includes(sessionUserId));

              return (
                <PostCard
                  key={postId || `${post.userName ?? "post"}-${post.createdAt ?? Math.random()}`}
                  post={post}
                  postId={postId}
                  imageList={imageList}
                  isLiked={isLiked}
                  isHighlighted={isHighlighted}
                  sessionUserId={sessionUserId}
                  onOpenProfile={onOpenProfile}
                  onSelectPost={setSelectedPost}
                  onLike={handleLike}
                  onHighlight={handleHighlight}
                  onComment={handleComment}
                  onShare={handleShare}
                  onReshare={handleReshare}
                  onCommentDraftChange={(currentPostId, value) =>
                    setCommentDrafts((current) => ({ ...current, [currentPostId]: value }))
                  }
                  commentDraft={commentDrafts[postId] ?? ""}
                  commenting={commentingId === postId}
                  onToggleCommenting={(currentPostId) =>
                    setCommentingId((current) => (current === currentPostId ? null : currentPostId))
                  }
                  postLikes={postLikes}
                  postHighlights={postHighlights}
                  onHandleComment={handleComment}
                />
              );
            })}
          </div>
        )}
      </Section>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          sessionUserId={sessionUserId}
        />
      )}

      {statusModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
          onClick={() => setStatusModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#15271d]">Add status</h3>
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="rounded-xl bg-[#f1f5f2] px-3 py-1.5 text-xs font-semibold text-[#5f7073]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleStatusImageChange(event.target.files?.[0])}
                />
                <span className="flex h-52 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#b9d9c6] bg-[#f1faf4] text-sm font-semibold text-[#168b45]">
                  {statusImage ? (
                    <img src={statusImage} alt="Status preview" className="h-full w-full object-cover" />
                  ) : (
                    "Choose an image"
                  )}
                </span>
              </label>

              <input
                type="text"
                value={statusTitle}
                onChange={(event) => setStatusTitle(event.target.value)}
                maxLength={120}
                placeholder="Give it a title..."
                className="w-full rounded-xl border border-[#dfe9e2] px-3 py-2.5 text-sm outline-none focus:border-[#1c9d57]"
              />

              <div className="flex flex-wrap gap-2">
                {["Update", "News", "Event", "Alert"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setStatusTag(tag)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      statusTag === tag
                        ? "bg-[#1c9d57] text-white"
                        : "bg-[#f1f5f2] text-[#5f7073]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {statusError && (
                <p className="rounded-xl bg-[#fff4f1] px-3 py-2 text-xs text-[#7f362f]">
                  {statusError}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreateStatus}
                disabled={statusSaving}
                className="w-full rounded-xl bg-[#1c9d57] py-3 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
              >
                {statusSaving ? "Posting…" : "Post status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
