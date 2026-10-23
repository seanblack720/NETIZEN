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
  const requests = await (await clientPromise).db("netizen").collection("proRequests").find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ requests });
}

export async function PATCH(request: NextRequest) {
  if (!(await adminSession(request))) return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  const { id, status } = await request.json();
  if (typeof id !== "string" || !ObjectId.isValid(id) || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ message: "Invalid request update" }, { status: 400 });
  }
  const db = (await clientPromise).db("netizen");
  const proRequest = await db.collection("proRequests").findOne({ _id: new ObjectId(id) });
  if (!proRequest) return NextResponse.json({ message: "Request not found" }, { status: 404 });
  await db.collection("proRequests").updateOne({ _id: proRequest._id }, { $set: { status, reviewedAt: new Date() } });
  if (status === "approved") await db.collection("profiles").updateOne({ userId: proRequest.userId }, { $set: { isPro: true, proApprovedAt: new Date() } }, { upsert: true });
  return NextResponse.json({ success: true });
}
