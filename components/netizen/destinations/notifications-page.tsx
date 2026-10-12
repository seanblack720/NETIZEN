"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Heart, MessageSquareText, UserRound } from "lucide-react";

import { DestinationContent } from "./destination-content";

type NotificationItem = {
  id: string;
  userId: string;
  receiverId?: string | null;
  creatorId?: string | null;
  senderId?: string | null;
  actorId: string;
  actorName: string;
  actorImage?: string | null;
  type:
    | "post-reaction"
    | "comment"
    | "reply"
    | "mention"
    | "comment-reaction"
    | "reply-reaction"
    | "post-like"
    | "post-comment"
    | "comment-like"
    | "reply-like";
  postId?: string | null;
  commentId?: string | null;
  replyId?: string | null;
  message: string;
  link?: string | null;
  read?: boolean;
  seen?: boolean;
  createdAt?: string;
};

const typeMeta = {
  "post-reaction": { label: "reacted to your post", icon: Heart, tone: "text-[#df4059] bg-[#fff1f3]" },
  "post-like": { label: "liked your post", icon: Heart, tone: "text-[#df4059] bg-[#fff1f3]" },
  comment: { label: "commented on your post", icon: MessageSquareText, tone: "text-[#1c9d57] bg-[#edf9f1]" },
  "post-comment": { label: "commented on your post", icon: MessageSquareText, tone: "text-[#1c9d57] bg-[#edf9f1]" },
  reply: { label: "replied to your comment", icon: MessageSquareText, tone: "text-[#1c9d57] bg-[#edf9f1]" },
  mention: { label: "mentioned you", icon: UserRound, tone: "text-[#1c9d57] bg-[#edf9f1]" },
  "comment-reaction": { label: "reacted to your comment", icon: Heart, tone: "text-[#df4059] bg-[#fff1f3]" },
  "comment-like": { label: "liked your comment", icon: Heart, tone: "text-[#df4059] bg-[#fff1f3]" },
  "reply-reaction": { label: "reacted to your reply", icon: Heart, tone: "text-[#df4059] bg-[#fff1f3]" },
  "reply-like": { label: "liked your reply", icon: Heart, tone: "text-[#df4059] bg-[#fff1f3]" },
} as const;

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (!ignore) {
          if (!response.ok) {
            setError(data?.message || "Failed to load notifications");
            setNotifications([]);
            return;
          }

          setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
          setError(null);
        }
      } catch (loadError) {
        if (!ignore) {
          console.error("Failed to load notifications:", loadError);
          setError("Could not load notifications right now.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, []);

  async function markAsSeen(ids: string[]) {
    if (!ids.length) return;

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      setNotifications((current) =>
        current.map((notification) =>
          ids.includes(notification.id)
            ? { ...notification, read: true, seen: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as seen:", error);
    }
  }

  useEffect(() => {
    const unseenIds = notifications
      .filter((notification) => !notification.seen && !notification.read)
      .map((notification) => notification.id);

    if (unseenIds.length) {
      markAsSeen(unseenIds);
    }
  }, [notifications]);

  if (loading) {
    return (
      <DestinationContent title="Notifications" description="Checking for the latest activity.">
        <div className="mt-4 text-sm text-[#5f7073]">Loading notifications…</div>
      </DestinationContent>
    );
  }

  return (
    <DestinationContent
      title="Notifications"
      description="Stay up to date with your community."
    >
      <div className="mt-6 w-full max-w-190 space-y-3 text-left">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-[#e2e9e5] bg-[#f7faf8] p-5 text-sm text-[#5f7073]">
            <div className="mb-3 flex items-center justify-center text-[#1c9d57]">
              <Bell className="h-5 w-5" />
            </div>
            You’re all caught up. No notifications yet.
          </div>
        ) : (
          notifications.map((notification) => {
            const meta = typeMeta[notification.type as keyof typeof typeMeta] || {
              label: "updated",
              icon: UserRound,
              tone: "text-[#1c9d57] bg-[#edf9f1]",
            };
            const Icon = meta.icon;
            const isSeen = Boolean(notification.seen || notification.read);

            return (
              <a
                key={notification.id}
                href={notification.link || "/"}
                className={`block rounded-2xl border p-4 transition ${
                  isSeen ? "border-[#e3eae4] bg-white" : "border-[#cfe9d9] bg-[#f2fbf6] shadow-[0_0_0_1px_rgba(28,157,87,0.08)]"
                }`}
                onClick={() => {
                  if (!isSeen) {
                    markAsSeen([notification.id]);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full ${meta.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-semibold text-[#15271d]">
                          <span>{notification.actorName || "Someone"}</span>
                          <span className="text-[#7a8682]">{meta.label}</span>
                        </p>
                        <p className="mt-1 text-sm text-[#5f7073]">{notification.message}</p>
                      </div>

                      {!isSeen ? (
                        <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#1c9d57] shadow-[0_0_10px_rgba(28,157,87,0.75)]" aria-label="Unread notification" />
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#7a8682]">
                      <span>
                        {notification.createdAt
                          ? new Date(notification.createdAt).toLocaleString()
                          : "Just now"}
                      </span>
                      {isSeen ? (
                        <span className="inline-flex items-center gap-1 text-[#5f7073]">
                          <CheckCheck className="h-3.5 w-3.5" />
                          Seen
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>
    </DestinationContent>
  );
}
