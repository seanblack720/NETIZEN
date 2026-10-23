import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { auth } from '@/lib/auth'

const DB_NAME = 'netizen'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)

    const statuses = await db
      .collection('statuses')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()

    return NextResponse.json({
      success: true,
      statuses: statuses.map(status => ({
        ...status,
        id: String(status._id),
      }))
    })
  } catch (error) {
    console.error('GET /api/statuses error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch statuses',
      },
      {
        status: 500,
      }
    )
  }
}

const MAX_IMAGE_STRING_LENGTH = 7_000_000 // ~5MB image, base64-encoded

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'You must be signed in to add a status' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { image, title, tag } = body

    if (!image || typeof image !== 'string' || image.length > MAX_IMAGE_STRING_LENGTH) {
      return NextResponse.json(
        { success: false, message: 'A status image is required' },
        { status: 400 }
      )
    }

    const safeTitle =
      typeof title === 'string' && title.trim()
        ? title.trim().slice(0, 120)
        : 'New status'

    const safeTag =
      typeof tag === 'string' && tag.trim()
        ? tag.trim().slice(0, 24)
        : 'Update'

    const status = {
      image,
      title: safeTitle,
      tag: safeTag,
      userId: session.user.id,
      userName: session.user.name ?? 'Netizen',
      createdAt: new Date(),
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)

    const result = await db.collection('statuses').insertOne(status)

    return NextResponse.json(
      {
        success: true,
        status: { ...status, id: String(result.insertedId) },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/statuses error:', error)

    return NextResponse.json(
      { success: false, message: 'Failed to create status' },
      { status: 500 }
    )
  }
}
