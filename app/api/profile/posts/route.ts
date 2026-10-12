import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

const DB_NAME = "netizen";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId")?.trim();
    const profileUserId = requestedUserId || session?.user?.id;

    if (!profileUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const posts = await db
      .collection("posts")
      .find({ userId: String(profileUserId) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      posts,
      userId: String(profileUserId),
    });
  } catch (error) {
    console.error("GET /api/profile/posts error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch profile posts",
      },
      { status: 500 }
    );
  }
}
