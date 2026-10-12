import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

const DB_NAME = "netizen";
const editableFields = ["bio", "location", "phone", "birthDate", "coverImage"] as const;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  const db = (await clientPromise).db(DB_NAME);
  const [profile, followers, following] = await Promise.all([
    db.collection("profiles").findOne({ userId: session.user.id }),
    db.collection("follows").countDocuments({ followingId: session.user.id }),
    db.collection("follows").countDocuments({ followerId: session.user.id }),
  ]);

  return NextResponse.json({
    user: session.user,
    profile: profile ?? { userId: session.user.id, bio: "", location: "", phone: "", birthDate: "", coverImage: "" },
    followers,
    following,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  const body = await request.json();
  const profile = Object.fromEntries(editableFields.map((field) => [field, text(body?.[field], field === "bio" ? 500 : 160)]));
  const name = text(body?.name, 80);
  const image = text(body?.image, 7_000_000);

  if (image && !image.startsWith("data:image/") && !/^https?:\/\//.test(image)) {
    return NextResponse.json({ message: "Profile image must be an image URL or uploaded image." }, { status: 400 });
  }

  const db = (await clientPromise).db(DB_NAME);
  await db.collection("profiles").updateOne(
    { userId: session.user.id },
    { $set: { ...profile, userId: session.user.id, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );

  if (name || image) {
    await db.collection("user").updateOne(
      { id: session.user.id },
      { $set: { ...(name ? { name } : {}), ...(image ? { image } : {}), updatedAt: new Date() } },
    );
  }

  return NextResponse.json({ success: true, message: "Profile saved." });
}
