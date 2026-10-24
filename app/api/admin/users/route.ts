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
  const users = await db
    .collection("user")
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  return NextResponse.json({
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      username: u.username,
      userHandle: u.userHandle,
      email: u.email,
      role: u.role ?? "user",
      isPro: u.isPro,
      image: u.image,
      createdAt: u.createdAt,
    })),
  });
}

export async function DELETE(request: NextRequest) {
  if (!(await adminSession(request))) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { id } = await request.json();
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  }

  const db = (await clientPromise).db("netizen");

  // Never delete yourself
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user && String(session.user.id) === id) {
    return NextResponse.json({ message: "Cannot delete your own account" }, { status: 400 });
  }

  await db.collection("user").deleteOne({ _id: new ObjectId(id) });
  await db.collection("posts").deleteMany({ userId: id });
  await db.collection("profiles").deleteMany({ userId: id });

  return NextResponse.json({ success: true });
}
