import type { Db } from "mongodb";

export type NotificationType =
  | "post-reaction"
  | "comment"
  | "reply"
  | "mention"
  | "comment-reaction"
  | "reply-reaction"
  | "netizen-request";

export type LegacyNotificationType =
  | "post-like"
  | "post-comment"
  | "comment-like"
  | "reply-like";

export type NotificationPayload = {
  senderId: string;
  receiverId?: string | null;
  creatorId?: string | null;
  userId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorImage?: string | null;
  type: NotificationType | LegacyNotificationType;
  postId?: string | null;
  commentId?: string | null;
  replyId?: string | null;
  message: string;
  link?: string | null;
  seen?: boolean;
};

export async function createNotification(
  db: Pick<Db, "collection">,
  notification: NotificationPayload
) {
  const receiverId = notification.receiverId ?? notification.userId ?? null;

  if (!notification.senderId || !receiverId) return null;
  if (notification.senderId === receiverId) return null;

  const doc = {
    senderId: notification.senderId,
    receiverId,
    creatorId: notification.creatorId ?? receiverId,
    userId: receiverId,
    actorId: notification.actorId ?? notification.senderId,
    actorName: notification.actorName ?? "Someone",
    actorImage: notification.actorImage ?? null,
    type: notification.type,
    postId: notification.postId ?? null,
    commentId: notification.commentId ?? null,
    replyId: notification.replyId ?? null,
    message: notification.message,
    link: notification.link ?? null,
    read: false,
    seen: notification.seen ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("notifications").insertOne(doc);

  return {
    ...doc,
    id: String(result.insertedId),
    _id: String(result.insertedId),
  };
}

export function normalizeNotificationType(type: unknown): NotificationType | LegacyNotificationType | null {
  const allowed: Array<NotificationType | LegacyNotificationType> = [
    "post-reaction",
    "comment",
    "reply",
    "mention",
    "comment-reaction",
    "reply-reaction",
    "post-like",
    "post-comment",
    "comment-like",
    "reply-like",
  ];

  return typeof type === "string" && allowed.includes(type as NotificationType | LegacyNotificationType)
    ? (type as NotificationType | LegacyNotificationType)
    : null;
}

export function getMentionUsernames(content: string) {
  return [
    ...new Set(
      (content.match(/@([a-zA-Z0-9._-]+)/g) ?? [])
        .map((match) => match.slice(1).trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

export async function createMentionNotifications(
  db: Pick<Db, "collection">,
  payload: {
    senderId: string;
    senderName?: string | null;
    senderImage?: string | null;
    content: string;
    postId?: string | null;
    commentId?: string | null;
    replyId?: string | null;
    link?: string | null;
    creatorId?: string | null;
  }
) {
  const usernames = getMentionUsernames(payload.content);
  if (!usernames.length) return [];

  const created: Array<Record<string, any>> = [];

  for (const username of usernames) {
    const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    for (const collectionName of ["users", "user"]) {
      const userDoc = await db.collection(collectionName).findOne({
        $or: [
          { name: { $regex: `^${escaped}$`, $options: "i" } },
          { email: { $regex: `^${escaped}$`, $options: "i" } },
        ],
      });

      if (!userDoc) continue;

      const receiverId = String(userDoc._id ?? userDoc.id ?? "");
      if (!receiverId || receiverId === payload.senderId) continue;

      const result = await createNotification(db, {
        senderId: payload.senderId,
        receiverId,
        creatorId: payload.creatorId ?? receiverId,
        actorId: payload.senderId,
        actorName: payload.senderName ?? "Someone",
        actorImage: payload.senderImage ?? null,
        type: "mention",
        postId: payload.postId ?? null,
        commentId: payload.commentId ?? null,
        replyId: payload.replyId ?? null,
        message: `${payload.senderName || "Someone"} mentioned you`,
        link: payload.link ?? null,
      });

      if (result) created.push(result);
      break;
    }
  }

  return created;
}

// ...client notification helper moved to a client-only module: lib/notifications-client.ts
