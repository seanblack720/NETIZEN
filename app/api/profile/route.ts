import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const DB_NAME = "netizen";
const editableFields = ["bio", "location", "phone", "birthDate", "coverImage"] as const;

// What anyone who is signed in may see about another user
const PUBLIC_USER_FIELDS = [
  "id",
  "name",
  "userHandle",
  "image",
  "avatar",
  "country",
  "gender",
  "interests",
  "isPro",
  "emailVerified",
  "createdAt",
  "bio",
  "location",
  "coverImage",
] as const;

// Only the owner of the profile gets these back
const PRIVATE_USER_FIELDS = ["email", "phone", "birthDate", "age"] as const;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isImageValue(value: string) {
  return value.startsWith("data:image/") || /^https?:\/\//.test(value);
}

function pick(source: Record<string, any> | null, fields: readonly string[]) {
  const out: Record<string, any> = {};
  if (!source) return out;
  for (const field of fields) {
    if (source[field] !== undefined) out[field] = source[field];
  }
  return out;
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get("userId")?.trim();
  const targetUserId = requestedUserId || session.user.id;
  const isOwner = String(targetUserId) === String(session.user.id);

  const db = (await clientPromise).db(DB_NAME);
  const [profile, followers, following, followDoc, netizenRequest] =
    await Promise.all([
      db.collection("profiles").findOne({ userId: targetUserId }),
      db.collection("follows").countDocuments({ followingId: targetUserId }),
      db.collection("follows").countDocuments({ followerId: targetUserId }),
      db.collection("follows").findOne({
        followerId: session.user.id,
        followingId: targetUserId,
      }),
      db.collection("netizenRequests").findOne({
        $or: [
          { fromUserId: session.user.id, toUserId: targetUserId },
          { fromUserId: targetUserId, toUserId: session.user.id },
        ],
      }),
    ]);

  // session.user.id from better-auth is the MongoDB _id; some user docs also
  // carry a separate `id` field. Try both so any post creator resolves.
  let userDoc = await db.collection("user").findOne({ id: targetUserId });
  if (!userDoc && ObjectId.isValid(targetUserId)) {
    userDoc = await db.collection("user").findOne({ _id: new ObjectId(targetUserId) });
  }

  // Never send the whole user document: it contains the password hash, email and phone
  const targetUser = {
    id: targetUserId,
    ...pick(userDoc, PUBLIC_USER_FIELDS),
    ...(isOwner ? pick(userDoc, PRIVATE_USER_FIELDS) : {}),
    // How many netizens this user has added (mutual connections)
    netizens: userDoc?.addedNetizens?.length ?? 0,
    // Whether the logged-in viewer follows this user
    isFollowing: !!followDoc,
    // Netizen-request status between the viewer and this user
    netizenRequestStatus: netizenRequest?.status ?? null,
    netizenRequestId: netizenRequest?._id ? String(netizenRequest._id) : null,
    netizenRequestFrom: netizenRequest ? String(netizenRequest.fromUserId) : null,
  };

  const profileData = {
    userId: targetUserId,
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    coverImage: profile?.coverImage ?? "",
    // phone and birth date are private
    phone: isOwner ? profile?.phone ?? "" : "",
    birthDate: isOwner ? profile?.birthDate ?? "" : "",
  };

  return NextResponse.json({
    user: session.user,
    targetUser,
    profile: profileData,
    followers,
    following,
    isOwner,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  // Partial update: only the fields that were actually sent are changed.
  // (Before, sending just one field wiped the others.)
  const profileUpdate: Record<string, string> = {};
  for (const field of editableFields) {
    if (body?.[field] === undefined) continue;

    if (field === "coverImage") {
      const cover = text(body.coverImage, 7_000_000);
      if (cover && !isImageValue(cover)) {
        return NextResponse.json({ message: "Cover image must be an image URL or uploaded image." }, { status: 400 });
      }
      profileUpdate.coverImage = cover;
      continue;
    }

    profileUpdate[field] = text(body[field], field === "bio" ? 500 : 160);
  }

  const name = text(body?.name, 80);
  const image = text(body?.image, 7_000_000);
  const gender = text(body?.gender, 80);
  const country = text(body?.country, 80);
  const interests = Array.isArray(body?.interests)
    ? body.interests
        .filter((i: unknown) => typeof i === "string")
        .map((i: string) => i.trim().toLowerCase().slice(0, 40))
        .filter(Boolean)
    : null;

  if (image && !isImageValue(image)) {
    return NextResponse.json({ message: "Profile image must be an image URL or uploaded image." }, { status: 400 });
  }

  const db = (await clientPromise).db(DB_NAME);

  if (Object.keys(profileUpdate).length > 0) {
    await db.collection("profiles").updateOne(
      { userId: session.user.id },
      { $set: { ...profileUpdate, userId: session.user.id, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
  }

  const userUpdate: Record<string, any> = { updatedAt: new Date() };
  if (name) userUpdate.name = name;
  if (image) userUpdate.image = image;
  if (gender !== undefined) userUpdate.gender = gender;
  if (country !== undefined) userUpdate.country = country;
  if (interests !== null) userUpdate.interests = interests;

  if (Object.keys(userUpdate).length > 1) {
    // user docs store the id under MongoDB _id (the `id` field is never written on create),
    // so try `id` first then fall back to `_id`.
    let result = await db.collection("user").updateOne({ id: session.user.id }, { $set: userUpdate });
    if (result.matchedCount === 0 && ObjectId.isValid(session.user.id)) {
      await db.collection("user").updateOne({ _id: new ObjectId(session.user.id) }, { $set: userUpdate });
    }
  }

  return NextResponse.json({ success: true, message: "Profile saved." });
}