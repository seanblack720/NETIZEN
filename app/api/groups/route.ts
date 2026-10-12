import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

const text = (value: unknown, length: number) => typeof value === "string" ? value.trim().slice(0, length) : "";

export async function GET() {
  const groups = await (await clientPromise).db("netizen").collection("groups").find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  const body = await request.json();
  const name = text(body.name, 100), description = text(body.description, 500);
  if (!name) return NextResponse.json({ message: "Group name is required." }, { status: 400 });
  const group = { name, description, category: text(body.category, 60), image: text(body.image, 7_000_000), ownerId: session.user.id, ownerName: session.user.name || "Netizen member", memberIds: [session.user.id], members: 1, createdAt: new Date() };
  const result = await (await clientPromise).db("netizen").collection("groups").insertOne(group);
  return NextResponse.json({ group: { _id: result.insertedId, ...group } }, { status: 201 });
}
