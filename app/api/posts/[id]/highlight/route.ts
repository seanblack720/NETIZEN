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
    const postObjId = new ObjectId(id);
    const userId = String(session.user.id);

    const post = await db.collection("posts").findOne({ _id: postObjId });
    if (!post) return NextResponse.json({ message: "Post not found" }, { status: 404 });

    const highlightedBy: string[] = Array.isArray(post.highlightedBy) ? post.highlightedBy : Array.isArray((post as any).likedBy) ? (post as any).likedBy : [];
    const isHighlighted = highlightedBy.includes(userId);

    if (highlighted === false) {
      if (!isHighlighted) return NextResponse.json({ success: true, highlighted: false, highlightCount: highlightedBy.length });
      await db.collection("posts").updateOne({ _id: postObjId }, { $pull: { highlightedBy: userId } as any });
      // keep legacy likedBy in sync
      await db.collection("posts").updateOne({ _id: postObjId }, { $pull: { likedBy: userId } as any });
      const updated = await db.collection("posts").findOne({ _id: postObjId });
      const count = Array.isArray(updated?.highlightedBy) ? updated.highlightedBy.length : 0;
      return NextResponse.json({ success: true, highlighted: false, highlightCount: Math.max(0, count) });
    }

    if (isHighlighted) {
      return NextResponse.json({ success: true, highlighted: true, highlightCount: highlightedBy.length });
    }
    await db.collection("posts").updateOne({ _id: postObjId }, { $addToSet: { highlightedBy: userId } as any });
    // also keep legacy field for old clients
    await db.collection("posts").updateOne({ _id: postObjId }, { $addToSet: { likedBy: userId } as any });
    const updated2 = await db.collection("posts").findOne({ _id: postObjId });
    const count2 = Array.isArray(updated2?.highlightedBy) ? updated2.highlightedBy.length : 0;
    return NextResponse.json({ success: true, highlighted: true, highlightCount: Math.max(0, count2) });
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
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ message: "Invalid post ID" }, { status: 400 });
    const db = (await clientPromise).db(DB_NAME);
    const post = await db.collection("posts").findOne({ _id: new ObjectId(id) });
    const arr: string[] = Array.isArray((post as any)?.highlightedBy) ? (post as any).highlightedBy : Array.isArray((post as any)?.likedBy) ? (post as any).likedBy : [];
    const highlighted = arr.includes(String(session.user.id));
    const highlightCount = Math.max(0, arr.length);
    return NextResponse.json({ highlighted, highlightCount });
  } catch (error) {
    console.error("Highlight check error:", error);
    return NextResponse.json(
      { message: "Failed to check highlight" },
      { status: 500 }
    );
  }
}
