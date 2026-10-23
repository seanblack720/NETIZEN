import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  const { userId } = await request.json();
  if (typeof userId !== "string" || !userId || userId === session.user.id) {
    return NextResponse.json({ message: "Choose another user to follow." }, { status: 400 });
  }

  const db = (await clientPromise).db("netizen");
  const key = { followerId: session.user.id, followingId: userId };
  const existing = await db.collection("follows").findOne(key);
  if (existing) {
    await db.collection("follows").deleteOne({ _id: existing._id });
    return NextResponse.json({ following: false });
  }

  await db.collection("follows").insertOne({ ...key, createdAt: new Date() });
  return NextResponse.json({ following: true });
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId")?.trim() || session.user.id;
  const filter = searchParams.get("filter"); // "followers" | "following" | null

  const db = (await clientPromise).db("netizen");

  if (filter === "followers") {
    const rows = await db.collection("follows").find({ followingId: targetUserId }).toArray();
    const ids = rows.map((r) => r.followerId);
    const users = await db.collection("user").find({ id: { $in: ids } }).toArray();
    return NextResponse.json({ users });
  }

  if (filter === "following") {
    const rows = await db.collection("follows").find({ followerId: targetUserId }).toArray();
    const ids = rows.map((r) => r.followingId);
    const users = await db.collection("user").find({ id: { $in: ids } }).toArray();
    return NextResponse.json({ users });
  }

  const [followers, following] = await Promise.all([
    db.collection("follows").countDocuments({ followingId: targetUserId }),
    db.collection("follows").countDocuments({ followerId: targetUserId }),
  ]);

  return NextResponse.json({ followers, following });
}
