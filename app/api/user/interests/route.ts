import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongoose, User } from "@/lib/mongoose";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Sign in required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, interests } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(interests) || interests.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one interest is required" },
        { status: 400 }
      );

    }

    // Normalize interests
    const normalizedInterests = Array.from(
      new Set(
        interests
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().toLowerCase())
          .filter((item) => /^[a-z0-9-]{2,40}$/.test(item))
      )
    ).slice(0, 80);

    if (normalizedInterests.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid interests provided" },
        { status: 400 }
      );
    }

    await connectMongoose();

    // Only allow the user to set their own interests
    const targetUserId = userId === session.user.id ? userId : session.user.id;

    const user = await User.findByIdAndUpdate(
      targetUserId,
      { $set: { interests: normalizedInterests, updatedAt: new Date() } },
      { new: true }
    ).select("interests userHandle name email");

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Interests saved successfully",
      interests: user.interests,
    });
  } catch (error) {
    console.error("Save interests error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save interests" },
      { status: 500 }
    );
  }
}
