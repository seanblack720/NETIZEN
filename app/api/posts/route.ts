import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { auth } from '@/lib/auth'

const DB_NAME = 'netizen'
const MAX_IMAGES = 4
const MAX_IMAGE_STRING_LENGTH = 7_000_000 // ~5MB image, base64-encoded

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')?.trim()

    const client = await clientPromise
    const db = client.db(DB_NAME)

    const filter = userId ? { userId: String(userId) } : {}

    const posts = await db
      .collection('posts')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      posts,
    })
  } catch (error) {
    console.error('GET /api/posts error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch posts',
      },
      {
        status: 500,
      }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Identify the poster from their session, never from client-supplied fields.
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          message: 'You must be signed in to post',
        },
        {
          status: 401,
        }
      )
    }

    const body = await request.json()
    const { content, images } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post content is required',
        },
        {
          status: 400,
        }
      )
    }

    // Images are optional, but if present must be a clean array of data-url strings.
    let safeImages: string[] = []

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Images must be an array',
          },
          {
            status: 400,
          }
        )
      }

      if (images.length > MAX_IMAGES) {
        return NextResponse.json(
          {
            success: false,
            message: `You can attach up to ${MAX_IMAGES} images`,
          },
          {
            status: 400,
          }
        )
      }

      for (const image of images) {
        if (typeof image !== 'string' || !image.startsWith('data:image/')) {
          return NextResponse.json(
            {
              success: false,
              message: 'Each image must be a valid image data URL',
            },
            {
              status: 400,
            }
          )
        }

        if (image.length > MAX_IMAGE_STRING_LENGTH) {
          return NextResponse.json(
            {
              success: false,
              message: 'One of the images is too large',
            },
            {
              status: 400,
            }
          )
        }
      }

      safeImages = images
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)

    const post = {
      content: content.trim(),
      images: safeImages,

      // Trusted fields, pulled from the session, not the request body.
      userId: session.user.id,
      userName: session.user.name || 'Unknown user',
      userImage: session.user.image || null,

      likes: 0,
      comments: 0,
      shares: 0,

      likedBy: [],

      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection('posts').insertOne(post)

    return NextResponse.json(
      {
        success: true,
        message: 'Post created successfully',

        post: {
          _id: result.insertedId,
          ...post,
        },
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error('POST /api/posts error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create post',
      },
      {
        status: 500,
      }
    )
  }
}