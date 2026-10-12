"use client";
import Link from "next/link";
import { Heart, MessageCircle, MoreHorizontal, Plus, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { groups } from "@/lib/netizen-data";
import { Avatar } from "./app-shell";
import { PostDetailModal } from "./post-detail-modal";
import { PostCard } from "./post-card";
import { createClientNotification } from "@/lib/notifications-client";

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
  likedBy?: string[];
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="m-0 text-sm text-slate-500 tracking-wide">{title}</h2>
        {action && (
          <button className="border-0 bg-transparent text-emerald-700 font-bold">{action}</button>
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
      const normalized = {
        ...newPost,
        likes: Number(newPost.likes ?? 0),
        comments: Number(newPost.comments ?? 0),
        shares: Number(newPost.shares ?? 0),
        likedBy: Array.isArray(newPost.likedBy) ? newPost.likedBy : [],
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
        const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
        const postLikeState = postLikes[postId];

        if (!postLikeState) return post;

        return {
          ...post,
          likes: postLikeState.likes,
          likedBy: postLikeState.hasLiked ? [...new Set([...likedBy, sessionUserId])] : likedBy.filter((id) => id !== sessionUserId),
        };
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

    // Optimistic update
    const wasLiked = postLikes[postId]?.hasLiked ?? post.likedBy?.includes(sessionUserId) ?? false;
    const currentLikes = postLikes[postId]?.likes ?? post.likes ?? 0;

    setPostLikes(prev => ({
      ...prev,
      [postId]: {
        likes: wasLiked ? currentLikes - 1 : currentLikes + 1,
        hasLiked: !wasLiked
      }
    }));

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to update like");
      }

      const likedBy = Array.isArray(data?.post?.likedBy) ? data.post.likedBy : post.likedBy ?? [];
      const likes = typeof data?.post?.likes === "number" ? data.post.likes : post.likes ?? 0;

      if (!wasLiked && post.userId && post.userId !== sessionUserId) {
        await createClientNotification({
          senderId: sessionUserId,
          receiverId: post.userId,
          creatorId: post.userId,
          actorId: sessionUserId,
          actorName: "You",
          type: "post-reaction",
          postId: String(postId),
          message: "You reacted to their post",
          link: `/posts/${String(postId)}`,
        });
      }

      updatePost(postId, { likedBy, likes });
      setPostLikes(prev => ({
        ...prev,
        [postId]: {
          likes,
          hasLiked: likedBy.includes(sessionUserId)
        }
      }));
      setError("");
    } catch (err) {
      console.error("Like failed:", err);
      // Revert optimistic update
      setPostLikes(prev => ({
        ...prev,
        [postId]: {
          likes: currentLikes,
          hasLiked: wasLiked
        }
      }));
      setError(err instanceof Error ? err.message : "Unable to update like");
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

    // Optimistic update
    applyCommentUpdate(postId, draft);

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

      const comments = typeof data?.post?.comments === "number" ? data.post.comments : post.comments ?? 0;
      updatePost(postId, { comments });
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      setCommentingId(null);
      setError("");
    } catch (err) {
      console.error("Comment failed:", err);
      setError(err instanceof Error ? err.message : "Unable to post comment");
    }
  }

  async function handleShare(post: FeedPost) {
    const postId = getPostId(post);

    if (!postId) return;

    const shareUrl = `${window.location.origin}/posts/${postId}`;

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

      const shares = typeof data?.post?.shares === "number" ? data.post.shares : post.shares ?? 0;
      updatePost(postId, { shares });
      setError("");
    } catch (err) {
      console.error("Share failed:", err);
      setError(err instanceof Error ? err.message : "Unable to share post");
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

  useEffect(() => {
    if (!incomingPost || !incomingPost.content) return;

    setPosts((currentPosts) => {
      const id = getPostId(incomingPost);
      const hasSame = currentPosts.some((item) => getPostId(item) === id);
      if (hasSame) return currentPosts;

      return [{ ...incomingPost, likes: Number(incomingPost.likes ?? 0), comments: Number(incomingPost.comments ?? 0), shares: Number(incomingPost.shares ?? 0), likedBy: Array.isArray(incomingPost.likedBy) ? incomingPost.likedBy : [], images: Array.isArray(incomingPost.images) ? incomingPost.images : [] }, ...currentPosts];
    });
  }, [incomingPost]);

  return (
    <div className="max-w-[880px] ">
      {error && (
        <div className="mb-4 rounded-2xl border border-[#f3d7d0] bg-[#fff4f1] px-3 py-2 text-sm text-[#7f362f] transition-all duration-300" style={{ display: error ? 'block' : 'none' }}>
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

      <Section title="ADDED NETIZENS STATUS" className="mt-0 sm:mt-8">
        <div className="flex gap-3 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              if (!sessionUserId) {
                setError("Please sign in to add a status.");
                return;
              }
              setStatusModalOpen(true);
            }}
            className="flex h-[184px] min-w-[132px] shrink-0 flex-col items-center justify-center gap-2 rounded-[17px] border-2 border-dashed border-[#b9d9c6] bg-[#f1faf4] text-[#168b45] transition hover:bg-[#e7f7ed] active:scale-95"
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
              className="relative h-[184px] min-w-[132px] shrink-0 overflow-hidden rounded-[17px] border-0 bg-[#20342d] p-0 text-left text-white"
              onClick={() => onNavigate?.("feed")}
            >
              <img
                src={status.image}
                alt={status.title || "Status"}
                className="h-full w-full object-cover brightness-[0.75]"
              />
              <div className="absolute left-0 right-0 top-[45%] bottom-0 bg-gradient-to-b from-transparent to-black/80" />
              <span className="absolute left-2 top-2 z-10 rounded-[18px] bg-emerald-500 px-2 py-1 text-xs font-semibold">
                {status.tag || "Update"}
              </span>
              <strong className="absolute bottom-3 left-3 right-3 z-10 text-sm leading-tight">
                {status.title || "Status"}
              </strong>
            </button>
          ))}

          {statuses.length === 0 && (
            <div className="flex h-[184px] min-w-[132px] shrink-0 items-center rounded-[17px] border border-[#e5ece7] bg-white px-4 text-xs text-[#68776f]">
              No statuses yet — be the first to post one.
            </div>
          )}
        </div>
      </Section>

      <Section title="GROUPS" action="See all" className="mt-3 sm:mt-6">
        <div className="flex gap-3 overflow-x-auto pb-2 md:flex-col md:overflow-visible">
          {groups.map((group) => (
            <button
              key={group.name}
              onClick={() => onNavigate?.("groups")}
              className="flex shrink-0 items-center gap-4 min-w-[260px] w-fit p-4 border border-gray-200 rounded-[17px] bg-white shadow-[0_3px_12px_rgba(25,58,45,0.03)] text-left md:min-w-0"
            >
              <Avatar src={group.image} alt={group.name} className="w-[58px] h-[58px] rounded-[14px] object-cover" />
              <div>

              <div>
                <b className="block text-base">{group.name}</b>
                <span className="block mt-1 text-sm text-slate-500">{group.members}</span>
              </div>
              <div className="flex items-center ml-auto">
                <Avatar src="/avatar-1.png" alt="" className="w-7 h-7 rounded-full -ml-2 border-2 border-white object-cover" />
                <Avatar src="/avatar-2.png" alt="" className="w-7 h-7 rounded-full -ml-2 border-2 border-white object-cover" />
                <Avatar src="/avatar-3.png" alt="" className="w-7 h-7 rounded-full -ml-2 border-2 border-white object-cover" />
                <i className="grid place-items-center w-10 h-10 ml-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">{group.more}</i>
              </div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="RECENT POSTS" className="mt-3 sm:mt-6">
        {loading ? (
          <div className="rounded-2xl border border-[#edf3ee] bg-white p-5 text-sm text-[#5b6b62]">Loading posts...</div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {posts.map((post) => {
              const postId = getPostId(post);
              const imageList = Array.isArray(post.images)
                ? post.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
                : [];
              const isLiked = Boolean(
                sessionUserId && Array.isArray(post.likedBy) && post.likedBy.includes(sessionUserId),
              );

              return (
                <PostCard
                  key={postId || `${post.userName ?? "post"}-${post.createdAt ?? Math.random()}`}
                  post={post}
                  postId={postId}
                  imageList={imageList}
                  isLiked={isLiked}
                  sessionUserId={sessionUserId}
                  onOpenProfile={onOpenProfile}
                  onSelectPost={setSelectedPost}
                  onLike={handleLike}
                  onComment={handleComment}
                  onShare={handleShare}
                  onCommentDraftChange={(currentPostId, value) =>
                    setCommentDrafts((current) => ({ ...current, [currentPostId]: value }))
                  }
                  commentDraft={commentDrafts[postId] ?? ""}
                  commenting={commentingId === postId}
                  onToggleCommenting={(currentPostId) =>
                    setCommentingId((current) => (current === currentPostId ? null : currentPostId))
                  }
                  postLikes={postLikes}
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
