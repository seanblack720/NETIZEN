import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";

const DB_NAME = "netizen";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  const viewerId = session.user.id;
  const db = (await clientPromise).db(DB_NAME);
  const { searchParams } = new URL(request.url);
  const withUser = searchParams.get("userId")?.trim();

  // Look up the netizen-request status between the viewer and another user
  if (withUser) {
    const request = await db.collection("netizenRequests").findOne({
      $or: [
        { fromUserId: viewerId, toUserId: withUser },
        { fromUserId: withUser, toUserId: viewerId },
      ],
    });
    return NextResponse.json({ request: request ?? null });
  }

  const [received, sent] = await Promise.all([
    db
      .collection("netizenRequests")
      .find({ toUserId: viewerId, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray(),
    db
      .collection("netizenRequests")
      .find({ fromUserId: viewerId, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray(),
  ]);

  const receivedIds = received.map((r) => String(r.fromUserId));
  const sentIds = sent.map((r) => String(r.toUserId));
  const [receivedUsers, sentUsers] = await Promise.all([
    receivedIds.length
      ? db.collection("user").find({ id: { $in: receivedIds } }).toArray()
      : [],
    sentIds.length ? db.collection("user").find({ id: { $in: sentIds } }).toArray() : [],
  ]);

  return NextResponse.json({
    received: received.map((r, i) => ({ ...r, user: receivedUsers[i] })),
    sent: sent.map((r, i) => ({ ...r, user: sentUsers[i] })),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  const viewerId = session.user.id;
  const { toUserId } = await request.json();
  if (typeof toUserId !== "string" || !toUserId || toUserId === viewerId) {
    return NextResponse.json({ message: "Choose another user." }, { status: 400 });
  }

  const db = (await clientPromise).db(DB_NAME);

  const existing = await db.collection("netizenRequests").findOne({
    fromUserId: viewerId,
    toUserId,
    status: "pending",
  });
  if (existing) {
    return NextResponse.json({ message: "Request already sent." }, { status: 409 });
  }

  const accepted = await db.collection("netizenRequests").findOne({
    fromUserId: viewerId,
    toUserId,
    status: "accepted",
  });
  if (accepted) {
    return NextResponse.json({ message: "Already netizens." }, { status: 409 });
  }

  const targetUser = await db.collection("user").findOne({ id: toUserId });
  if (!targetUser) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const created = await db.collection("netizenRequests").insertOne({
    fromUserId: viewerId,
    toUserId,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await createNotification(db, {
    senderId: viewerId,
    receiverId: toUserId,
    actorId: viewerId,
    actorName: session.user.name || "Someone",
    actorImage: session.user.image ?? null,
    type: "netizen-request",
    message: `${session.user.name || "Someone"} wants to add you as a netizen`,
    link: `/profile/${viewerId}`,
  });

  return NextResponse.json(
    { success: true, message: "Netizen request sent.", requestId: String(created.insertedId) },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  const viewerId = session.user.id;
  const { requestId, action } = await request.json(); // "accept" | "reject" | "cancel"
  if (!requestId || !action) {
    return NextResponse.json({ message: "Missing requestId or action." }, { status: 400 });
  }

  const db = (await clientPromise).db(DB_NAME);
  let requestObjectId: ObjectId;
  try {
    requestObjectId = new ObjectId(requestId);
  } catch {
    return NextResponse.json({ message: "Invalid request id." }, { status: 400 });
  }
  const reqDoc = await db.collection("netizenRequests").findOne({ _id: requestObjectId });
  if (!reqDoc) {
    return NextResponse.json({ message: "Request not found." }, { status: 404 });
  }

  const fromUserId = String(reqDoc.fromUserId);
  const toUserId = String(reqDoc.toUserId);

  if (action === "cancel") {
    if (fromUserId !== viewerId) {
      return NextResponse.json({ message: "Not your request to cancel." }, { status: 403 });
    }
    await db.collection("netizenRequests").deleteOne({ _id: requestObjectId });
    return NextResponse.json({ success: true, message: "Request cancelled." });
  }

  if (action === "reject") {
    if (toUserId !== viewerId) {
      return NextResponse.json({ message: "Not your request to reject." }, { status: 403 });
    }
    await db.collection("netizenRequests").updateOne(
      { _id: requestObjectId },
      { $set: { status: "rejected", updatedAt: new Date() } }
    );
    return NextResponse.json({ success: true, message: "Request rejected." });
  }

  if (action === "accept") {
    if (toUserId !== viewerId) {
      return NextResponse.json({ message: "Not your request to accept." }, { status: 403 });
    }
    if (reqDoc.status !== "pending") {
      return NextResponse.json({ message: "Request is not pending." }, { status: 409 });
    }

    await db.collection("netizenRequests").updateOne(
      { _id: requestObjectId },
      { $set: { status: "accepted", updatedAt: new Date() } }
    );

    // Make them mutual netizens
    await db.collection("user").updateOne(
      { id: toUserId },
      { $addToSet: { addedNetizens: fromUserId } }
    );
    await db.collection("user").updateOne(
      { id: fromUserId },
      { $addToSet: { addedNetizens: toUserId } }
    );

    await createNotification(db, {
      senderId: viewerId,
      receiverId: fromUserId,
      actorId: viewerId,
      actorName: session.user.name || "Someone",
      actorImage: session.user.image ?? null,
      type: "netizen-request",
      message: `${session.user.name || "Someone"} accepted your netizen request`,
      link: `/profile/${viewerId}`,
    });

    return NextResponse.json({ success: true, message: "Netizen request accepted." });
  }

  return NextResponse.json({ message: "Unknown action." }, { status: 400 });
}
