// app/api/check-handle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

const DB_NAME = 'netizen'
const MAX_BASE = 15 // leaves room for up to 5 appended digits (20 total)

function clean(raw: string) {
  return raw
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, MAX_BASE)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const base = clean(searchParams.get('handle') ?? '')

  if (base.length < 2) {
    return NextResponse.json(
      { success: false, available: false, message: 'Handle is too short' },
      { status: 400 }
    )
  }

  try {
    const client = await clientPromise
    const users = client.db(DB_NAME).collection('user')

    // Matches handles stored with or without the leading "@"
    const isTaken = async (handle: string) =>
      Boolean(
        await users.findOne(
          { userHandle: { $in: [`@${handle}`, handle] } },
          { projection: { _id: 1 } }
        )
      )

    if (!(await isTaken(base))) {
      return NextResponse.json({ success: true, available: true, handle: base })
    }

    // Taken: find a free variant by appending random digits
    for (let attempt = 0; attempt < 15; attempt++) {
      const digits =
        attempt < 8
          ? Math.floor(1000 + Math.random() * 9000) // 4 digits
          : Math.floor(10000 + Math.random() * 90000) // 5 digits
      const candidate = `${base}${digits}`

      if (!(await isTaken(candidate))) {
        return NextResponse.json({ success: true, available: false, suggestion: candidate })
      }
    }

    return NextResponse.json({ success: true, available: false })
  } catch (error) {
    console.error('GET /api/check-handle error:', error)

    return NextResponse.json(
      { success: false, message: 'Failed to check handle' },
      { status: 500 }
    )
  }
}