import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

const image = (value: unknown) => typeof value === "string" && (value.startsWith("data:image/") || /^https?:\/\//.test(value)) ? value.slice(0, 7_000_000) : "";
const text = (value: unknown, length: number) => typeof value === "string" ? value.trim().slice(0, length) : "";

export async function GET() {
  const spots = await (await clientPromise).db("netizen").collection("taxiSpots").find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ spots });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  const body = await request.json();
  const name = text(body.name, 100), area = text(body.area, 100);
  if (!name || !area) return NextResponse.json({ message: "Spot name and area are required." }, { status: 400 });
  const spot = { name, area, directions: text(body.directions, 500), routes: text(body.routes, 300), image: image(body.image), videoUrl: text(body.videoUrl, 2048), createdBy: session.user.id, createdByName: session.user.name || "Netizen member", createdAt: new Date() };
  const result = await (await clientPromise).db("netizen").collection("taxiSpots").insertOne(spot);
  return NextResponse.json({ spot: { _id: result.insertedId, ...spot } }, { status: 201 });
}
