export async function createClientNotification(payload: {
  receiverId: string;
  creatorId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorImage?: string | null;
  type: string;
  postId?: string | null;
  commentId?: string | null;
  replyId?: string | null;
  message: string;
  link?: string | null;
  seen?: boolean;
}) {
  const response = await fetch("/api/notifications", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Failed to create notification");
  }

  return data?.notification ?? null;
}
