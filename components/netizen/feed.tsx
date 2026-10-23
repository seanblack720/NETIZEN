"use client";
import Link from "next/link";
import { ImagePlus, Loader2, Plus, RefreshCw } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { groups as communityGroups } from "@/lib/netizen-data";
import { PostDetailModal } from "./post-detail-modal";
import { PostCard } from "./post-card";
import { createClientNotification } from "@/lib/notifications-client";
import {
  StoryRail,
  StoryViewer,
  groupStatuses,
  type StatusItem,
} from "./status-stories";

function clamp(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

/* Theme tokens (same palette as the profile and post pages) */
const ui = {
  card: "bg-white dark:bg-[#101a17]",
  text: "text-[#15271d] dark:text-[#e6ece9]",
  muted: "text-[#718078] dark:text-[#9bb0a8]",
  border: "border-[#e3ebe6] dark:border-[#1e3a2f]",
  bubble: "bg-[#f0f2f1] dark:bg-[#24382f]",
  hover: "hover:bg-[#f2f6f3] dark:hover:bg-[#1f332b]",
  accent: "text-[#168b45] dark:text-[#7ee0b0]",
};

export type FeedPost = {
  id?: string;
  _id?: string;
  content?: string;
  images?: string[] | null;
  userId?: string;
  userName?: string | null;
  userImage?: string | null;
  userHandle?: string | null;
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
    originalUserHandle?: string | null;
  } | null;
  highlightCount?: number;
  highlightedByUser?: string[];
  createdAt?: string | Date;
};

export function Section({
  title,
  action,
  onAction,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className ?? ""}>
      <div className="mb-2.5 flex items-center justify-between px-4 sm:px-1">
        <h2 className={`m-0 text-[13px] font-bold uppercase tracking-[0.08em] ${ui.muted}`}>{title}</h2>
        {action && (
          <button
            type="button"
            onClick={onAction}
            className={`border-0 bg-transparent text-sm font-semibold ${ui.accent}`}
          >
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/* Shrinks a picked photo so status uploads stay small and fast */
function shrinkImage(file: File, max = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a valid image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process the image"));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/* =========================================================
   PULL TO REFRESH
   Pull down from the top of the feed, release past the line to reload
========================================================== */
function findScroller(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  let fallback: HTMLElement | null = null;
  while (node && node !== document.body && node !== document.documentElement) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === "auto" || oy === "scroll" || oy === "overlay") {
      if (node.scrollHeight > node.clientHeight + 1) return node;
      if (!fallback) fallback = node;
    }
    node = node.parentElement;
  }
  return fallback;
}

function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const THRESHOLD = 64;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startY = 0;
    let tracking = false;
    let wheelAcc = 0;
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    let lastScrollAt = 0;

    // find the element that really scrolls, and hide its scrollbar
    const scroller = () => {
      const sc = findScroller(el);
      sc?.setAttribute("data-feed-scroller", "");
      return sc;
    };
    scroller();

    const atTop = () => {
      const sc = scroller();
      return (sc ? sc.scrollTop : 0) <= 0 && window.scrollY <= 0;
    };

    // ignore gestures inside popups / full screen viewers
    const blocked = (target: EventTarget | null) =>
      refreshingRef.current ||
      document.body.style.overflow === "hidden" ||
      (target instanceof Element && !!target.closest(".fixed, [role='dialog']"));

    const setP = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    const run = async () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      setRefreshing(true);
      setP(54);
      try {
        await onRefreshRef.current();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        setP(0);
      }
    };

    /* ----- touch: pull down from the top ----- */
    const onStart = (e: TouchEvent) => {
      if (blocked(e.target) || !atTop()) return;
      startY = e.touches[0].clientY;
      tracking = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dy = e.touches[0].clientY - startY;

      if (dy <= 0) {
        if (pullRef.current > 0) setP(0);
        return;
      }
      if (!atTop()) {
        tracking = false;
        setP(0);
        setDragging(false);
        return;
      }

      setDragging(true);
      if (e.cancelable) e.preventDefault();
      setP(Math.min(96, dy * 0.5));
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      setDragging(false);

      if (pullRef.current >= THRESHOLD) run();
      else setP(0);
    };

    /* ----- wheel / trackpad: keep scrolling up at the very top ----- */
    const onScrollAny = () => {
      lastScrollAt = Date.now();
    };

    const onWheel = (e: WheelEvent) => {
      if (blocked(e.target)) return;

      if (e.deltaY >= 0) {
        wheelAcc = 0;
        if (pullRef.current > 0 && !refreshingRef.current) setP(0);
        return;
      }

      // ignore the tail of a normal scroll that just reached the top
      if (Date.now() - lastScrollAt < 350 || !atTop()) return;

      wheelAcc += -e.deltaY;
      setP(Math.min(96, wheelAcc * 0.3));

      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        if (pullRef.current >= THRESHOLD) run();
        else if (!refreshingRef.current) setP(0);
        wheelAcc = 0;
      }, 160);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("scroll", onScrollAny, true);

    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScrollAny, true);
      if (wheelTimer) clearTimeout(wheelTimer);
      findScroller(el)?.removeAttribute("data-feed-scroller");
    };
  }, []);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div ref={ref}>
      {/* green strip that opens under the header, with the spinner in it */}
      <div
        className="flex items-end justify-center overflow-hidden bg-[#15803d] dark:bg-[#052e1a]"
        style={{
          height: pull,
          transition: dragging ? "none" : "height .25s ease",
        }}
        aria-hidden={pull === 0}
      >
        <div
          className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-white text-[#15803d] shadow-lg"
          style={{ opacity: Math.max(0.25, progress), transform: `scale(${0.6 + progress * 0.4})` }}
        >
          <RefreshCw
            size={20}
            strokeWidth={2.5}
            className={refreshing ? "animate-spin" : ""}
            style={refreshing ? undefined : { transform: `rotate(${progress * 300}deg)` }}
          />
        </div>
      </div>
      {children}
    </div>
  );
}

/* =========================================================
   GROUPS CAROUSEL
   Wide cards, neighbours peek in from the sides, dots below
========================================================== */
function GroupCarousel({
  items,
  onOpen,
}: {
  items: any[];
  onOpen: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Open with the 2nd group centred and the 1st already scrolled off to the left
  useEffect(() => {
    const el = ref.current;
    if (!el || items.length < 2) return;

    const frame = requestAnimationFrame(() => {
      const card = el.children[1] as HTMLElement | undefined;
      if (!card) return;
      el.scrollTo({
        left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2,
        behavior: "auto",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [items.length]);

  return (
    <div
      ref={ref}
      className="relative -mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[7%] pb-6 pt-1 [scrollbar-width:none] sm:px-0 sm:snap-proximity [&::-webkit-scrollbar]:hidden"
    >
      {items.map((group) => (
        <article
          key={group.name}
          className="relative h-[121px] w-[86%] shrink-0 snap-center overflow-hidden rounded-[22px] border border-white/25 shadow-[0_12px_24px_-14px_rgba(21,128,61,0.55)] sm:w-[420px] dark:border-[#14532d]/60 dark:shadow-[0_12px_24px_-14px_rgba(5,46,26,0.8)]"
        >
          {/* light: header green · dark: original deep green */}
          <div
            className="absolute inset-0 dark:hidden"
            style={{ background: "linear-gradient(135deg,#15803d 0%,#16a34a 55%,#22c55e 100%)" }}
          />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{ background: "linear-gradient(135deg,#04200f 0%,#07391d 55%,#0b5a2d 100%)" }}
          />

          {/* picture on the right, fading into the card early so text stays readable */}
          {group.image && (
            <img
              src={group.image}
              alt=""
              loading="lazy"
              className="absolute inset-y-0 right-0 h-full w-[52%] object-cover"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, #000 75%)",
                maskImage: "linear-gradient(to right, transparent 0%, #000 75%)",
              }}
            />
          )}

          {/* member badge — white in light, lime in dark (avoid bg-white; globals remap it in dark) */}
          <span className="absolute right-3 top-2.5 grid h-8 min-w-8 place-items-center rounded-full bg-[#ffffff] px-1.5 text-[11px] font-extrabold leading-none text-[#15803d] shadow-lg dark:bg-[#4ade80] dark:text-[#04200f]">
            {group.more}
          </span>

          <div className="relative flex h-full max-w-[64%] flex-col justify-center gap-0.5 px-4 py-2.5">
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85 dark:text-[#86efac]/85">
              Community · {group.members}
            </span>
            <h3 className="line-clamp-2 text-[18px] font-bold leading-[1.15] text-white">
              {group.name}
            </h3>
            <button
              type="button"
              onClick={onOpen}
              className="mt-1 w-fit rounded-full bg-[#ffffff] px-4 py-1 text-[13px] font-bold text-[#15803d] shadow-[0_6px_16px_-6px_rgba(255,255,255,0.55)] transition active:scale-95 dark:bg-[#4ade80] dark:text-[#04200f] dark:shadow-[0_6px_16px_-6px_rgba(74,222,128,0.8)]"
            >
              View group
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

/* Global bits that only exist while the feed is on screen:
   shimmer animation, hidden scrollbars (browser bounce stays on) */
const FEED_CSS = `
@keyframes feedShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.feed-shimmer{background-image:linear-gradient(90deg,rgba(120,150,135,.14) 25%,rgba(120,150,135,.30) 50%,rgba(120,150,135,.14) 75%);background-size:200% 100%;animation:feedShimmer 1.5s linear infinite}
.feed-shimmer-light{background-image:linear-gradient(90deg,rgba(255,255,255,.14) 25%,rgba(255,255,255,.34) 50%,rgba(255,255,255,.14) 75%);background-size:200% 100%;animation:feedShimmer 1.5s linear infinite}
html,body,[data-feed-scroller]{scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior-y:auto}
html::-webkit-scrollbar,body::-webkit-scrollbar,[data-feed-scroller]::-webkit-scrollbar{display:none;width:0;height:0}
`;

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading posts">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`overflow-hidden border-y sm:rounded-2xl sm:border ${ui.border} ${ui.card}`}
        >
          <div className="flex items-center gap-3 p-4">
            <div className="feed-shimmer h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="feed-shimmer h-3 w-1/3 rounded-full" />
              <div className="feed-shimmer h-2.5 w-1/4 rounded-full" />
            </div>
            <div className="feed-shimmer h-8 w-16 rounded-full" />
          </div>
          <div className="space-y-2 px-4 pb-4">
            <div className="feed-shimmer h-3 w-full rounded-full" />
            <div className="feed-shimmer h-3 w-4/5 rounded-full" />
          </div>
          {i === 0 && <div className="feed-shimmer h-56 w-full" />}
          <div className="flex gap-3 p-4">
            <div className="feed-shimmer h-8 w-20 rounded-full" />
            <div className="feed-shimmer h-8 w-20 rounded-full" />
            <div className="feed-shimmer ml-auto h-8 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
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

export function Feed({
  refreshKey,
  onNavigate,
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
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewedGroups, setViewedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [statusesLoaded, setStatusesLoaded] = useState(false);
  const [error, setError] = useState("");
  const [postsError, setPostsError] = useState("");
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<{ name?: string | null; image?: string | null } | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [postLikes, setPostLikes] = useState<Record<string, { likes: number; hasLiked: boolean }>>({});
  const [postHighlights, setPostHighlights] = useState<Record<string, { highlightCount: number; highlighted: boolean }>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const scrolledSentRef = React.useRef<Set<string>>(new Set());

  const statusGroups = useMemo(
    () => groupStatuses(statuses, sessionUserId),
    [statuses, sessionUserId]
  );

  /* ---------- loaders (used on mount, on refreshKey and by pull to refresh) ---------- */
  async function loadSession() {
    try {
      const response = await fetch("/api/auth/get-session", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        setSessionUserId(null);
        setSessionUser(null);
        return;
      }

      const data = await response.json();
      setSessionUserId(data?.user?.id ?? null);
      setSessionUser(
        data?.user ? { name: data.user.name ?? null, image: data.user.image ?? null } : null
      );
    } catch (err) {
      console.error("Failed to load session for feed:", err);
      setSessionUserId(null);
      setSessionUser(null);
    } finally {
      setSessionResolved(true);
    }
  }

  async function loadPosts(silent = false) {
    try {
      if (!silent) setLoading(true);
      setPostsError("");

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
      setPostsError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  async function loadStatuses() {
    try {
      const response = await fetch("/api/statuses", {
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.statuses) {
        setStatuses(data.statuses);
      }
    } catch (err) {
      console.error("Failed to load statuses:", err);
    } finally {
      setStatusesLoaded(true);
    }
  }

  async function refreshAll() {
    setError("");
    await Promise.all([loadSession(), loadPosts(true), loadStatuses()]);
  }

  useEffect(() => {
    loadSession();
    loadPosts();
    loadStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    if (incomingPost) {
      prependPost(incomingPost);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!sessionUserId) {
      setBookmarkedIds(new Set());
      return;
    }
    fetch("/api/bookmarks", { credentials: "include" })
      .then((r) => r.json().catch(() => ({} as any)))
      .then((d: any) => {
        if (Array.isArray(d?.bookmarkedIds)) setBookmarkedIds(new Set(d.bookmarkedIds.map(String)));
      })
      .catch(() => {});
  }, [sessionUserId, posts.length]);

  async function handleBookmark(post: FeedPost) {
    const postId = getPostId(post);
    if (!postId || !sessionUserId) return;
    const wasBookmarked = bookmarkedIds.has(postId);
    const next = !wasBookmarked;
    setBookmarkedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(postId);
      else s.delete(postId);
      return s;
    });
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, bookmarked: next }),
      });
      const d = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(d?.message || "Bookmark failed");
      if (typeof d.bookmarked === "boolean") {
        setBookmarkedIds((prev) => {
          const s = new Set(prev);
          if (d.bookmarked) s.add(postId);
          else s.delete(postId);
          return s;
        });
      }
    } catch (e) {
      setBookmarkedIds((prev) => {
        const s = new Set(prev);
        if (wasBookmarked) s.add(postId);
        else s.delete(postId);
        return s;
      });
      setError(e instanceof Error ? e.message : "Unable to bookmark");
    }
  }

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

  function handleReshareSuccess(newPost: FeedPost) {
    if (!newPost) return;
    const originalId = (newPost as any).reshareOf || (newPost as any).reshareData?.originalPostId;
    if (originalId) {
      setPosts((cur)=>cur.map((p)=> String((p as any)._id ?? (p as any).id)===String(originalId) ? {...p, reshareCount: ((p as any).reshareCount ?? 0)+1} : p));
    }
    prependPost(newPost);
    setError("");
  }

  async function handleStatusImageChange(file?: File) {
    setStatusError("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusError("Please choose an image file.");
      return;
    }

    try {
      setStatusImage(await shrinkImage(file));
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Could not load that image.");
    }
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

      // reload so the new status comes back with your name, photo and time
      await loadStatuses();
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

  function openAddStatus() {
    if (!sessionUserId) {
      setError("Please sign in to add a status.");
      return;
    }
    setStatusModalOpen(true);
  }

  return (
    <PullToRefresh onRefresh={refreshAll}>
      <div className="mx-auto w-full max-w-[880px] pb-24">
        <style>{FEED_CSS}</style>
        {/* STATUS: gradient card, one story per person */}
        <div className="sm:mt-6">
          <StoryRail
            groups={statusGroups}
            viewed={viewedGroups}
            me={sessionUser}
            loading={!statusesLoaded}
            onAdd={openAddStatus}
            onOpen={(index) => setViewerIndex(index)}
          />
        </div>

        {error && (
          <div className="mx-3 my-4 flex items-start justify-between gap-3 rounded-2xl border border-[#f3d7d0] bg-[#fff4f1] px-4 py-3 text-sm text-[#7f362f] sm:mx-0">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-xs font-bold underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {sessionResolved && !sessionUserId && (
          <div className="mx-3 my-4 flex flex-col gap-2 rounded-2xl border border-[#cfe8d8] bg-[#f1faf4] px-4 py-3 text-sm text-[#28573d] sm:mx-0 sm:flex-row sm:items-center sm:justify-between">
            <span>You are not logged in. You can browse the feed, but sign in to post, like, or comment.</span>
            <Link href="/login" className="shrink-0 font-semibold text-[#07843b] underline underline-offset-2">
              Log in
            </Link>
          </div>
        )}

        {/* GROUPS */}
        <Section
          title="Groups"
          action="See all"
          onAction={() => onNavigate?.("groups")}
          className="mt-5"
        >
          <GroupCarousel items={communityGroups as any[]} onOpen={() => onNavigate?.("groups")} />
        </Section>

        {/* RECENT POSTS */}
        <Section title="Recent posts" className="mt-6">
          {loading ? (
            <FeedSkeleton />
          ) : postsError && posts.length === 0 ? (
            <div className="mx-3 rounded-2xl border border-[#f3d7d0] bg-[#fff4f1] p-5 text-center text-sm text-[#7f362f] sm:mx-0">
              <p>{postsError}</p>
              <button
                type="button"
                onClick={() => loadPosts()}
                className="mt-3 rounded-full border border-[#e8c2b9] px-4 py-1.5 font-semibold"
              >
                Try again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div
              className={`mx-3 rounded-2xl border p-8 text-center text-sm sm:mx-0 ${ui.border} ${ui.card} ${ui.muted}`}
            >
              <Plus className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
              No posts yet. Be the first to share something.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
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
                const imageList = ((post.reshareOf && post.reshareData?.originalImages ? post.reshareData.originalImages : post.images) as string[] | null | undefined || []).filter((image: string) => typeof image === "string" && image.trim().length > 0);
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
                  <div
                    key={postId || `${post.userName ?? "post"}-${post.createdAt ?? Math.random()}`}
                    className={`overflow-hidden border-y shadow-sm sm:rounded-2xl sm:border ${ui.border} ${ui.card}`}
                  >
                    <PostCard
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
                      onReshare={handleReshareSuccess}
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
                      bookmarkedIds={bookmarkedIds}
                      onBookmark={handleBookmark}
                    />
                  </div>
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

        {/* Full screen status viewer */}
        {viewerIndex !== null && statusGroups.length > 0 && (
          <StoryViewer
            groups={statusGroups}
            startIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
            onViewed={(key) =>
              setViewedGroups((current) => {
                if (current.has(key)) return current;
                const next = new Set(current);
                next.add(key);
                return next;
              })
            }
          />
        )}

        {/* Add status */}
        {statusModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            onClick={() => setStatusModalOpen(false)}
          >
            <div
              className={`w-full max-w-md rounded-t-3xl p-5 shadow-2xl sm:rounded-3xl ${ui.card}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${ui.text}`}>Add status</h3>
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${ui.bubble} ${ui.muted}`}
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
                    onChange={(event) => {
                      handleStatusImageChange(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <span className="flex h-60 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#c4b5fd] bg-[#f5f0ff] text-sm font-semibold text-[#6d28d9] dark:border-[#4c2a8c] dark:bg-[#1c1330] dark:text-[#c4b5fd]">
                    {statusImage ? (
                      <img src={statusImage} alt="Status preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex flex-col items-center gap-2">
                        <ImagePlus size={28} />
                        Choose an image
                      </span>
                    )}
                  </span>
                </label>

                <input
                  type="text"
                  value={statusTitle}
                  onChange={(event) => setStatusTitle(event.target.value)}
                  maxLength={120}
                  placeholder="Give it a title..."
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#7c3aed] ${ui.border} ${ui.card} ${ui.text}`}
                />

                <div className="flex flex-wrap gap-2">
                  {["Update", "News", "Event", "Alert"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setStatusTag(tag)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        statusTag === tag
                          ? "bg-[#7c3aed] text-white"
                          : `${ui.bubble} ${ui.muted}`
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] py-3 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
                >
                  {statusSaving && <Loader2 size={16} className="animate-spin" />}
                  {statusSaving ? "Posting…" : "Post status"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}