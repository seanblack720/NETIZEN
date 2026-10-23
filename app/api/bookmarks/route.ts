import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
const DB_NAME = "netizen";
function sanitizePostForFeed(post: Record<string, unknown>) {
  if (!post || typeof post !== "object") return post;
  const { password: _pw, ...rest } = post as Record<string, unknown> & { password?: unknown };
  for (const k of ["likes", "comments", "shares", "reshareCount"] as const) {
    const v = Number((rest as Record<string, unknown>)[k]);
    (rest as Record<string, unknown>)[k] = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  }
  const hbRaw: unknown = (rest as Record<string, unknown>).highlightedBy;
  const likedByFallback: unknown = (rest as Record<string, unknown>).likedBy;
  const hb: string[] = Array.isArray(hbRaw) ? (hbRaw as string[]) : Array.isArray(likedByFallback) ? (likedByFallback as string[]) : [];
  (rest as Record<string, unknown>).highlightedBy = hb;
  (rest as Record<string, unknown>).highlightedByUser = hb;
  (rest as Record<string, unknown>).highlightCount = hb.length;
  (rest as Record<string, unknown>).likedBy = hb;
  const reactionsRaw: unknown = (rest as Record<string, unknown>).reactions;
  const reactions: Record<string, string> = reactionsRaw && typeof reactionsRaw === "object" && !Array.isArray(reactionsRaw) ? (reactionsRaw as Record<string, string>) : {};
  (rest as Record<string, unknown>).reactions = reactions;
  if (Array.isArray((rest as Record<string, unknown>).images)) {
    (rest as Record<string, unknown>).images = ((rest as Record<string, unknown>).images as string[]).slice(0, 10);
  }
  return rest;
}
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
    const userId = String(session.user.id);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    let savedPosts: string[] = [];
    const tryFetch = async (filter: any) => {
      const u = await db.collection("user").findOne(filter);
      if (u && Array.isArray((u as any).savedPosts)) return (u as any).savedPosts as string[];
      return null;
    };
    savedPosts = (await tryFetch({ _id: new ObjectId(userId) } as any)) ?? (await tryFetch({ id: userId } as any)) ?? [];
    if (savedPosts.length === 0) return NextResponse.json({ success: true, posts: [], bookmarkedIds: [] });
    const objectIds: ObjectId[] = [];
    for (const pid of savedPosts) if (ObjectId.isValid(pid)) objectIds.push(new ObjectId(pid));
    if (objectIds.length === 0) return NextResponse.json({ success: true, posts: [], bookmarkedIds: savedPosts });
    const postsRaw = await db.collection("posts").find({ _id: { $in: objectIds } } as any).sort({ createdAt: -1 }).toArray();
    const posts = postsRaw.map((p) => sanitizePostForFeed(p as unknown as Record<string, unknown>));
    return NextResponse.json({ success: true, posts, bookmarkedIds: savedPosts });
  } catch (error) {
    console.error("GET /api/bookmarks error:", error);
    return NextResponse.json({ success: false, message: "Failed to load bookmarks" }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
    const userId = String(session.user.id);
    const body = await request.json().catch(() => ({}));
    const postIdRaw = (body.postId ?? body.id ?? "").toString().trim();
    if (!postIdRaw) return NextResponse.json({ success: false, message: "postId is required" }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    let postExists = false;
    if (ObjectId.isValid(postIdRaw)) {
      const found = await db.collection("posts").findOne({ _id: new ObjectId(postIdRaw) });
      postExists = !!found;
    }
    if (!postExists) return NextResponse.json({ success: false, message: "Post not found" }, { status: 404 });
    let userDoc = await db.collection("user").findOne({ _id: new ObjectId(userId) } as any);
    let userFilter: any = { _id: new ObjectId(userId) };
    if (!userDoc) { userDoc = await db.collection("user").findOne({ id: userId } as any); userFilter = { id: userId }; }
    if (!userDoc) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    const saved: string[] = Array.isArray((userDoc as any).savedPosts) ? (userDoc as any).savedPosts : [];
    const isBookmarked = saved.includes(postIdRaw);
    const desired = typeof body.bookmarked === "boolean" ? Boolean(body.bookmarked) : !isBookmarked;
    if (desired === isBookmarked) return NextResponse.json({ success: true, bookmarked: isBookmarked, savedPosts: saved });
    if (desired) await db.collection("user").updateOne(userFilter, { $addToSet: { savedPosts: postIdRaw } as any });
    else await db.collection("user").updateOne(userFilter, { $pull: { savedPosts: postIdRaw } as any });
    const updated = await db.collection("user").findOne(userFilter);
    const updatedSaved: string[] = Array.isArray((updated as any)?.savedPosts) ? (updated as any).savedPosts : [];
    return NextResponse.json({ success: true, bookmarked: desired, savedPosts: updatedSaved });
  } catch (error) {
    console.error("POST /api/bookmarks error:", error);
    return NextResponse.json({ success: false, message: "Failed to update bookmark" }, { status: 500 });
  }
}
