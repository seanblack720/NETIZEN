import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { createNotification, normalizeNotificationType } from "@/lib/notifications";

const DB_NAME = "netizen";

function normalizeNotification(notification: Record<string, any>) {
  if (!notification) return null;

  return {
    ...notification,
    id: String(notification._id),
    _id: String(notification._id),
    seen: Boolean(notification.seen ?? notification.read ?? false),
    read: Boolean(notification.read ?? false),
    createdAt: notification.createdAt ? new Date(notification.createdAt).toISOString() : new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const seenOnly = searchParams.get("seenOnly") === "true";
    const limit = Math.min(Number(searchParams.get("limit") ?? "20") || 20, 100);

    const db = (await clientPromise).db(DB_NAME);
    const query: Record<string, unknown> = {
      $or: [
        { receiverId: session.user.id },
        { creatorId: session.user.id },
      ],
    };

    if (unreadOnly) {
      query.seen = false;
    }

    if (seenOnly) {
      query.seen = true;
    }

    const notifications = await db
      .collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      notifications: notifications.map(normalizeNotification).filter(Boolean),
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ success: false, message: "Failed to load notifications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const receiverId = typeof body?.receiverId === "string" ? body.receiverId : "";
    const type = normalizeNotificationType(body?.type);
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!receiverId || !type || !message) {
      return NextResponse.json({ success: false, message: "receiverId, type, and message are required" }, { status: 400 });
    }

    const db = (await clientPromise).db(DB_NAME);
    const created = await createNotification(db, {
      senderId: session.user.id,
      receiverId,
      creatorId: typeof body?.creatorId === "string" ? body.creatorId : receiverId,
      actorId: typeof body?.actorId === "string" ? body.actorId : session.user.id,
      actorName: typeof body?.actorName === "string" ? body.actorName : session.user.name || "Someone",
      actorImage: typeof body?.actorImage === "string" ? body.actorImage : session.user.image || null,
      type,
      postId: typeof body?.postId === "string" ? body.postId : null,
      commentId: typeof body?.commentId === "string" ? body.commentId : null,
      replyId: typeof body?.replyId === "string" ? body.replyId : null,
      message,
      link: typeof body?.link === "string" ? body.link : null,
      seen: typeof body?.seen === "boolean" ? body.seen : false,
    });

    return NextResponse.json({ success: true, notification: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/notifications error:", error);
    return NextResponse.json({ success: false, message: "Failed to create notification" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string") : [];

    if (!ids.length) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    const db = (await clientPromise).db(DB_NAME);
    const objectIds = ids
      .map((id: string) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as ObjectId[];

    if (!objectIds.length) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    const result = await db.collection("notifications").updateMany(
      {
        $or: [
          { receiverId: session.user.id },
          { creatorId: session.user.id },
        ],
        _id: { $in: objectIds },
      },
      { $set: { seen: true, read: true, updatedAt: new Date() } },
    );

    return NextResponse.json({ success: true, updated: result.modifiedCount ?? 0 });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ success: false, message: "Failed to update notifications" }, { status: 500 });
  }
}
