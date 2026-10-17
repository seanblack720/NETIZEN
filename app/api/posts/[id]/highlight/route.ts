import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const DB_NAME = "netizen";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ message: "Sign in required" }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid post ID" }, { status: 400 });
    }

    const body = await request.json();
    const { highlighted } = body;

    const db = (await clientPromise).db(DB_NAME);
    const highlightId = new ObjectId(id);
    const userId = session.user.id;

    if (highlighted === false) {
      // Remove highlight
      await db.collection("highlights").deleteOne({ userId, postId: id });
      return NextResponse.json({ success: true, highlighted: false });
    }

    // Add highlight (upsert)
    await db.collection("highlights").updateOne(
      { userId, postId: id },
      { $set: { userId, postId: id, createdAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, highlighted: true });
  } catch (error) {
    console.error("Highlight error:", error);
    return NextResponse.json(
      { message: "Failed to update highlight" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ message: "Sign in required" }, { status: 401 });
    }

    const { id } = await params;
    const db = (await clientPromise).db(DB_NAME);

    const existing = await db.collection("highlights").findOne({
      userId: session.user.id,
      postId: id,
    });

    return NextResponse.json({ highlighted: !!existing });
  } catch (error) {
    console.error("Highlight check error:", error);
    return NextResponse.json(
      { message: "Failed to check highlight" },
      { status: 500 }
    );
  }
}
