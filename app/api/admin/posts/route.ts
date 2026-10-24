import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && admins.includes(email.toLowerCase()));
}

async function adminSession(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user && isAdmin(session.user.email) ? session : null;
}

export async function GET(request: NextRequest) {
  if (!(await adminSession(request))) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const db = (await clientPromise).db("netizen");
  const posts = await db
    .collection("posts")
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: String(p._id),
      userId: p.userId,
      userName: p.userName,
      userHandle: p.userHandle,
      userImage: p.userImage,
      content: p.content,
      images: p.images,
      likes: p.likes ?? 0,
      comments: p.comments ?? 0,
      shares: p.shares ?? 0,
      highlightedBy: Array.isArray(p.highlightedBy) ? p.highlightedBy.length : 0,
      createdAt: p.createdAt,
    })),
  });
}

export async function DELETE(request: NextRequest) {
  if (!(await adminSession(request))) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { id } = await request.json();
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid post ID" }, { status: 400 });
  }

  const db = (await clientPromise).db("netizen");
  await db.collection("posts").deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
}
