"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AtSign,
  Bell,
  CheckCheck,
  Heart,
  MessageSquareText,
  RefreshCw,
  Reply,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

type NotificationType =
  | "post-reaction"
  | "comment"
  | "reply"
  | "mention"
  | "comment-reaction"
  | "reply-reaction"
  | "netizen-request"
  | "post-like"
  | "post-comment"
  | "comment-like"
  | "reply-like";

type NotificationItem = {
  id: string;
  userId: string;
  receiverId?: string | null;
  creatorId?: string | null;
  senderId?: string | null;
  actorId: string;
  actorName: string;
  actorImage?: string | null;
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
  replyId?: string | null;
  message: string;
  link?: string | null;
  read?: boolean;
  seen?: boolean;
  createdAt?: string;
};

type Meta = { label: string; icon: LucideIcon; tone: string };

const reaction = (label: string): Meta => ({
  label,
  icon: Heart,
  tone: "bg-rose-500 text-white",
});
const comment = (label: string): Meta => ({
  label,
  icon: MessageSquareText,
  tone: "bg-emerald-600 text-white",
});

const typeMeta: Record<NotificationType, Meta> = {
  "post-reaction": reaction("reacted to your post"),
  "post-like": reaction("liked your post"),
  "comment-reaction": reaction("reacted to your comment"),
  "comment-like": reaction("liked your comment"),
  "reply-reaction": reaction("reacted to your reply"),
  "reply-like": reaction("liked your reply"),
  comment: comment("commented on your post"),
  "post-comment": comment("commented on your post"),
  reply: { label: "replied to your comment", icon: Reply, tone: "bg-emerald-600 text-white" },
  mention: { label: "mentioned you", icon: AtSign, tone: "bg-blue-600 text-white" },
  "netizen-request": { label: "sent you a netizen request", icon: UserPlus, tone: "bg-emerald-600 text-white" },
};

const fallbackMeta: Meta = { label: "sent you an update", icon: Bell, tone: "bg-emerald-600 text-white" };

// Types where `message` is likely a useful preview (the text of a comment, etc.)
const previewTypes = new Set<NotificationType>(["comment", "post-comment", "reply", "mention"]);

const isUnread = (n: NotificationItem) => !(n.read || n.seen);

function timeAgo(iso?: string) {
  if (!iso) return "Just now";
  const date = new Date(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return "";
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function dayGroup(iso?: string) {
  if (!iso) return "Today";
  const date = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((startOfToday.getTime() - date.getTime()) / 86_400_000);
  if (date >= startOfToday) return "Today";
  if (diffDays < 1) return "Yesterday";
  if (diffDays < 7) return "This week";
  return "Earlier";
}

const GROUP_ORDER = ["Today", "Yesterday", "This week", "Earlier"];

function Avatar({ name, src, meta }: { name: string; src?: string | null; meta: Meta }) {
  const Icon = meta.icon;
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="relative h-12 w-12 shrink-0">
      {src ? (
        <Image
          src={src}
          alt=""
          width={48}
          height={48}
          unoptimized
          className="h-12 w-12 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f4ec] text-base font-semibold text-[#1c9d57]">
          {initial}
        </div>
      )}
      <span
        className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white ${meta.tone}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="divide-y divide-[#eef2ef] border-y border-[#e3eae4] bg-white" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-4">
          <div className="h-12 w-12 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/3 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const inFlight = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!silent) setRefreshing(true);

    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Keep whatever we already have on a silent refresh failure
        if (!silent) {
          setError(data?.message || "Failed to load notifications");
        }
        return;
      }

      const list: NotificationItem[] = Array.isArray(data?.notifications) ? data.notifications : [];

      setNotifications(
        list
          // Never show people their own actions as notifications
          .filter((n) => !n.actorId || n.actorId !== n.userId)
          .sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
          )
      );
      setError(null);
    } catch (e) {
      console.error("Failed to load notifications:", e);
      if (!silent) setError("Could not load notifications right now.");
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load, refresh when tab regains focus, and poll gently
  useEffect(() => {
    load();

    const onVisible = () => {
      if (document.visibilityState === "visible") load(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => load(true), 30_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [load]);

  // Optimistic mark-as-read with rollback on failure
  const markAsRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const idSet = new Set(ids);

    setNotifications((current) =>
      current.map((n) => (idSet.has(n.id) ? { ...n, read: true, seen: true } : n))
    );

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error(`PATCH failed (${response.status})`);
    } catch (e) {
      console.error("Failed to mark notifications as read:", e);
      setNotifications((current) =>
        current.map((n) => (idSet.has(n.id) ? { ...n, read: false, seen: false } : n))
      );
    }
  }, []);

  const unreadCount = useMemo(() => notifications.filter(isUnread).length, [notifications]);

  const visible = useMemo(
    () => (filter === "unread" ? notifications.filter(isUnread) : notifications),
    [notifications, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const n of visible) {
      const key = dayGroup(n.createdAt);
      map.set(key, [...(map.get(key) ?? []), n]);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ label: g, items: map.get(g)! }));
  }, [visible]);

  return (
    <section className="w-full pb-28 pt-3 text-left -mx-4 left-0 right-0 max-w-[880px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#15271d]">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-[#1c9d57] px-2 py-0.5 text-xs font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => load()}
            disabled={refreshing}
            aria-label="Refresh notifications"
            className="rounded-full p-2 text-[#5f7073] transition hover:bg-[#e6f4ec] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => markAsRead(notifications.filter(isUnread).map((n) => n.id))}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-[#1c9d57] transition hover:bg-[#e6f4ec] disabled:cursor-default disabled:text-[#a3aeaa] disabled:hover:bg-transparent"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div role="tablist" aria-label="Filter notifications" className="mt-3 flex gap-2 px-4">
        {(["all", "unread"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === key
                ? "bg-[#1c9d57] text-white"
                : "bg-white text-[#5f7073] ring-1 ring-[#e3eae4] hover:bg-[#f2fbf6]"
            }`}
          >
            {key === "all" ? "All" : `Unread${unreadCount ? ` (${unreadCount})` : ""}`}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="mt-5">
        {loading ? (
          <Skeleton />
        ) : error && notifications.length === 0 ? (
          <div className="mx-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => load()}
              className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center border-y border-[#e3eae4] bg-white px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f4ec] text-[#1c9d57]">
              <Bell className="h-6 w-6" />
            </div>
            <p className="mt-4 font-semibold text-[#15271d]">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="mt-1 max-w-xs text-sm text-[#5f7073]">
              {filter === "unread"
                ? "You've read everything. Switch to All to see past activity."
                : "When people react to or comment on your posts, you'll see it here."}
            </p>
            {filter === "unread" && (
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="mt-4 rounded-full bg-[#1c9d57] px-4 py-2 text-sm font-medium text-white"
              >
                Show all
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.label}>
                <h2 className="mb-2 px-4 text-sm font-semibold text-[#5f7073]">{group.label}</h2>
                <ul className="border-y border-[#e3eae4] bg-white">
                  {group.items.map((n, index) => {
                    const meta = typeMeta[n.type] ?? fallbackMeta;
                    const unread = isUnread(n);
                    const showPreview =
                      previewTypes.has(n.type) && n.message && n.message.trim().length > 0;

                    return (
                      <li key={n.id} className={index > 0 ? "border-t border-[#eef2ef]" : ""}>
                        <Link
                          href={n.link || "/"}
                          onClick={() => unread && markAsRead([n.id])}
                          className={`flex items-start gap-3 p-4 transition active:bg-[#e6f4ec] ${
                            unread ? "bg-[#f2fbf6]" : "bg-white hover:bg-[#f8fbf9]"
                          }`}
                        >
                          <Avatar name={n.actorName} src={n.actorImage} meta={meta} />

                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] leading-snug text-[#5f7073]">
                              <span className="font-semibold text-[#15271d]">
                                {n.actorName || "Someone"}
                              </span>{" "}
                              {meta.label}
                            </p>

                            {showPreview && (
                              <p className="mt-1 line-clamp-2 text-sm text-[#7a8682]">{n.message}</p>
                            )}

                            <p
                              className={`mt-1.5 text-xs ${
                                unread ? "font-medium text-[#1c9d57]" : "text-[#8a9691]"
                              }`}
                              title={n.createdAt ? new Date(n.createdAt).toLocaleString() : undefined}
                            >
                              {timeAgo(n.createdAt)}
                            </p>
                          </div>

                          {unread && (
                            <span
                              className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1c9d57]"
                              aria-label="Unread"
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}