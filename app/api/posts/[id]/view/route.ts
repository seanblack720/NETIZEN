import { NextRequest, NextResponse } from "next/server"
import { ObjectId, type UpdateFilter } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { auth } from "@/lib/auth"

const DB_NAME = "netizen"

type RouteContext = {
  params: Promise<{ id: string }>
}

type PostDocument = {
  _id: ObjectId
  opened?: string[]
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be signed in to view this post",
        },
        { status: 401 },
      )
    }

    const { id } = await context.params

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid post ID",
        },
        { status: 400 },
      )
    }

    const db = (await clientPromise).db(DB_NAME)

    const postsCollection = db.collection<PostDocument>("posts")

    const update: UpdateFilter<PostDocument> = {
      $addToSet: {
        opened: session.user.id,
      } as unknown as UpdateFilter<PostDocument>,
    }

    const post = await postsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      update,
      {
        returnDocument: "after",
      },
    )

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          message: "Post not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      openedCount: Array.isArray(post.opened)
        ? post.opened.length
        : 0,
    })
  } catch (error) {
    console.error("POST /api/posts/[id]/view error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Failed to record post view",
      },
      { status: 500 },
    )
  }
}