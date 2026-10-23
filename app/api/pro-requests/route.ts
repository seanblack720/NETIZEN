import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  const requestRecord = await (await clientPromise).db("netizen").collection("proRequests")
    .findOne({ userId: session.user.id }, { sort: { createdAt: -1 } });
  return NextResponse.json({ request: requestRecord ?? null });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  const { reason } = await request.json();
  const db = (await clientPromise).db("netizen");
  const existing = await db.collection("proRequests").findOne({ userId: session.user.id, status: "pending" });
  if (existing) return NextResponse.json({ message: "You already have a request under review." }, { status: 409 });

  await db.collection("proRequests").insertOne({
    userId: session.user.id,
    userName: session.user.name || "Unknown user",
    userEmail: session.user.email || "",
    reason: typeof reason === "string" ? reason.trim().slice(0, 600) : "",
    amount: 200,
    currency: "ZAR",
    status: "pending",
    createdAt: new Date(),
  });
  return NextResponse.json({ success: true, message: "Pro request sent for review." }, { status: 201 });
}
