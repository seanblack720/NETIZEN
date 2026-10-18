import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { auth } from '@/lib/auth'

const DB_NAME = 'netizen'
const MAX_IMAGES = 10
const MAX_IMAGE_STRING_LENGTH = 7_000_000 // ~5MB image, base64-encoded

function sanitizePostForFeed(post: Record<string, unknown>) {
  if (!post || typeof post !== "object") return post
  // never leak private fields even if a doc somehow contains them
  const { password: _pw, ...rest } = post as Record<string, unknown> & { password?: unknown }
  // ensure counters are non-negative ints
  for (const k of ["likes", "comments", "shares", "reshareCount"] as const) {
    const v = Number((rest as Record<string, unknown>)[k])
    ;(rest as Record<string, unknown>)[k] = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0
  }
  // highlights: source of truth is highlightedBy array (keeps userIds for ranking algorithm)
  const hbRaw: unknown = (rest as Record<string, unknown>).highlightedBy
  const likedByFallback: unknown = (rest as Record<string, unknown>).likedBy
  const hb: string[] = Array.isArray(hbRaw) ? (hbRaw as string[]) : Array.isArray(likedByFallback) ? (likedByFallback as string[]) : []
  ;(rest as Record<string, unknown>).highlightedBy = hb
  ;(rest as Record<string, unknown>).highlightedByUser = hb
  ;(rest as Record<string, unknown>).highlightCount = hb.length
  ;(rest as Record<string, unknown>).likedBy = hb
  // reactions: map of userId -> emoji
  const reactionsRaw: unknown = (rest as Record<string, unknown>).reactions
  const reactions: Record<string, string> = reactionsRaw && typeof reactionsRaw === "object" && !Array.isArray(reactionsRaw) ? (reactionsRaw as Record<string, string>) : {}
  ;(rest as Record<string, unknown>).reactions = reactions
  // commentsList is the canonical comments store; cap large text for feed payload
  if (Array.isArray((rest as Record<string, unknown>).images)) {
    ;(rest as Record<string, unknown>).images = ((rest as Record<string, unknown>).images as string[]).slice(0, 10)
  }
  return rest
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')?.trim()
    const cursor = searchParams.get('cursor')?.trim()
    const limitParam = searchParams.get('limit')?.trim()
    let limit = 20
    if (limitParam) {
      const n = Number(limitParam)
      if (Number.isFinite(n)) limit = Math.min(50, Math.max(1, Math.floor(n)))
    }

    const session = await auth.api.getSession({ headers: request.headers })
    const viewerId = session?.user?.id ? String(session.user.id) : null

    const client = await clientPromise
    const db = client.db(DB_NAME)

    const filter: Record<string, unknown> = {}
    if (userId) filter.userId = String(userId)
    // cursor-based pagination (createdAt desc)
    if (cursor) {
      const d = new Date(cursor)
      if (!Number.isNaN(d.getTime())) filter.createdAt = { $lt: d }
    }

    const postsRaw = await db
      .collection('posts')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()

    const rankedPosts = postsRaw.sort((a, b) => {
      const aHighlighted = viewerId && Array.isArray(a.highlightedBy) && a.highlightedBy.includes(viewerId) ? 1 : 0
      const bHighlighted = viewerId && Array.isArray(b.highlightedBy) && b.highlightedBy.includes(viewerId) ? 1 : 0
      if (aHighlighted !== bHighlighted) return bHighlighted - aHighlighted

      const aHighlights = Array.isArray(a.highlightedBy) ? a.highlightedBy.length : 0
      const bHighlights = Array.isArray(b.highlightedBy) ? b.highlightedBy.length : 0
      if (aHighlights !== bHighlights) return bHighlights - aHighlights

      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    })

    const hasMore = rankedPosts.length > limit
    const postsSlice = hasMore ? rankedPosts.slice(0, limit) : rankedPosts
    const posts = postsSlice.map((p) => sanitizePostForFeed(p as unknown as Record<string, unknown>))
    const nextCursor = hasMore ? String((postsSlice[postsSlice.length - 1] as unknown as { createdAt: Date })?.createdAt?.toISOString?.() ?? null) : null

    return NextResponse.json({
      success: true,
      posts,
      nextCursor,
      hasMore,
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
    const trimmed = content.trim()
    if (trimmed.length > 5000) {
      return NextResponse.json({ success: false, message: 'Post is too long (max 5000 characters)' }, { status: 400 })
    }
    // basic sanitization: strip zero-width and collapse excessive blank lines handled client-side, just trim here

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
      content: trimmed,
      images: safeImages,

      // Trusted fields, pulled from the session, not the request body.
      userId: session.user.id,
      userName: session.user.name || 'Unknown user',
      userImage: session.user.image || null,

      likes: 0,
      comments: 0,
      shares: 0,

      highlightedBy: [],
      scrolled: [],
      scrolledAt: {},
      opened: [],
      reactions: {},
      reshareOf: null,
      reshareCount: 0,
      // keep legacy likedBy for backward compat (will be migrated)
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
