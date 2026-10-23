import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { auth } from '@/lib/auth'
import { ObjectId } from 'mongodb'

const DB_NAME = 'netizen'
const MAX_IMAGES = 10
const MAX_IMAGE_STRING_LENGTH = 7_000_000

// Must match the emojis in the reaction picker
const ALLOWED_REACTIONS = ['👍', '❤️', '🥰', '😆', '😮', '😢', '😡']

const ALLOWED_ACTIONS = [
  'like',
  'react',
  'comment',
  'reply-comment',
  'like-comment',
  'share',
  'view',
  'reshare',
  'scrolled',
  'highlight',
]

function clampNonNegative(n: any) {
  const v = Number(n)
  return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0
}

function normalizePost(post: Record<string, any>) {
  if (!post) return null

  const id = post._id ? String(post._id) : null

  // derive highlightedBy from either new field or legacy likedBy
  const highlightedByRaw = Array.isArray(post.highlightedBy) ? post.highlightedBy : Array.isArray(post.likedBy) ? post.likedBy : []
  const highlightCount = highlightedByRaw.length
  const reactionsRaw = post.reactions && typeof post.reactions === "object" && !Array.isArray(post.reactions) ? (post.reactions as Record<string, string>) : {}

  return {
    ...post,
    id,
    _id: id,
    // always expose new fields
    highlightedBy: highlightedByRaw,
    highlightCount: Math.max(0, highlightCount),
    highlightedByUser: highlightedByRaw,
    likedBy: highlightedByRaw,
    reactions: reactionsRaw,
    scrolled: Array.isArray(post.scrolled) ? post.scrolled : [],
    scrolledAt: post.scrolledAt && typeof post.scrolledAt === 'object' ? post.scrolledAt : {},
    likes: clampNonNegative(post.likes),
    comments: clampNonNegative(post.comments),
    shares: clampNonNegative(post.shares),
    reshareCount: clampNonNegative(post.reshareCount),
    // clamp comment likes too
    commentsList: Array.isArray(post.commentsList) ? post.commentsList.map((c: any) => ({
      ...c,
      likes: clampNonNegative(c.likes),
      likedBy: Array.isArray(c.likedBy) ? c.likedBy : [],
      replies: Array.isArray(c.replies) ? c.replies.map((r: any) => ({ ...r, likes: clampNonNegative(r.likes), likedBy: Array.isArray(r.likedBy) ? r.likedBy : [] })) : [],
    })) : post.commentsList,
  }
}

// mongodb driver v5 returns { value: doc }, v6 returns the doc itself.
// This handles both so we never fall back to a stale post by accident.
function unwrap(result: any, fallback: any) {
  const doc =
    result && typeof result === 'object' && 'value' in result
      ? result.value
      : result

  return doc ?? fallback
}

export async function GET(
  request: NextRequest,
  context: { params?: { id?: string } | Promise<{ id: string }> }
) {
  try {
    const params = await Promise.resolve(context.params ?? {})
    const { id } = params

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid post ID' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const postId = new ObjectId(id)

    const post = await db.collection('posts').findOne({ _id: postId })

    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      post: normalizePost(post),
    })
  } catch (error) {
    console.error('GET /api/posts/[id] error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch post',
      },
      {
        status: 500,
      }
    )
  }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session?.user) {
            return NextResponse.json(
                { success: false, message: 'You must be signed in to post' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { content, images } = body

        if (!content || typeof content !== 'string' || !content.trim()) {
            return NextResponse.json(
                { success: false, message: 'Post content is required' },
                { status: 400 }
            )
        }

        let safeImages: string[] = []

        if (images !== undefined) {
            if (!Array.isArray(images)) {
                return NextResponse.json(
                    { success: false, message: 'Images must be an array' },
                    { status: 400 }
                )
            }

            if (images.length > MAX_IMAGES) {
                return NextResponse.json(
                    { success: false, message: `You can attach up to ${MAX_IMAGES} images` },
                    { status: 400 }
                )
            }

            for (const image of images) {
                if (typeof image !== 'string' || !image.startsWith('data:image/')) {
                    return NextResponse.json(
                        { success: false, message: 'Each image must be a valid image data URL' },
                        { status: 400 }
                    )
                }

                if (image.length > MAX_IMAGE_STRING_LENGTH) {
                    return NextResponse.json(
                        { success: false, message: 'One of the images is too large' },
                        { status: 400 }
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
            userId: session.user.id,
            userName: session.user.name || 'Unknown user',
            userImage: session.user.image || null,
            likes: 0,
            comments: 0,
            shares: 0,
            likedBy: [],
            opened: [],
            reactions: {},
            reshareOf: null,
            reshareCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        const result = await db.collection('posts').insertOne(post)

        return NextResponse.json(
            {
                success: true,
                message: 'Post created successfully',
                post: { _id: result.insertedId, ...post },
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('POST /api/posts error:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to create post' },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session?.user) {
            return NextResponse.json(
                { success: false, message: 'You must be signed in to edit' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { id, content, images } = body

        if (!id || !ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: 'Invalid post ID' },
                { status: 400 }
            )
        }

        if (!content || typeof content !== 'string' || !content.trim()) {
            return NextResponse.json(
                { success: false, message: 'Post content is required' },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db(DB_NAME)
        const postId = new ObjectId(id)

        const post = await db.collection('posts').findOne({ _id: postId })

        if (!post) {
            return NextResponse.json(
                { success: false, message: 'Post not found' },
                { status: 404 }
            )
        }

        if (post.userId !== session.user.id) {
            return NextResponse.json(
                { success: false, message: 'You can only edit your own posts' },
                { status: 403 }
            )
        }

        let safeImages = post.images

        if (images !== undefined) {
            if (!Array.isArray(images) || images.length > MAX_IMAGES) {
                return NextResponse.json(
                    { success: false, message: 'Invalid images' },
                    { status: 400 }
                )
            }
            safeImages = images
        }

        await db.collection('posts').updateOne(
            { _id: postId },
            {
                $set: {
                    content: content.trim(),
                    images: safeImages,
                    updatedAt: new Date(),
                },
            }
        )

        return NextResponse.json({
            success: true,
            message: 'Post updated successfully',
        })
    } catch (error) {
        console.error('PUT /api/posts error:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to update post' },
            { status: 500 }
        )
    }
}

export async function DELETE(
  request: NextRequest,
  context: { params?: { id?: string } | Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session?.user) {
            return NextResponse.json(
                { success: false, message: 'You must be signed in to delete' },
                { status: 401 }
            )
        }

        const params = await Promise.resolve(context.params ?? {})
        const idFromUrl = params.id ?? new URL(request.url).searchParams.get('id')
        const id = idFromUrl

        if (!id || !ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: 'Invalid post ID' },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db(DB_NAME)
        const postId = new ObjectId(id)

        const post = await db.collection('posts').findOne({ _id: postId })

        if (!post) {
            return NextResponse.json(
                { success: false, message: 'Post not found' },
                { status: 404 }
            )
        }

        if (post.userId !== session.user.id) {
            return NextResponse.json(
                { success: false, message: 'You can only delete your own posts' },
                { status: 403 }
            )
        }

        await db.collection('posts').deleteOne({ _id: postId })

        return NextResponse.json({
            success: true,
            message: 'Post deleted successfully',
        })
    } catch (error) {
        console.error('DELETE /api/posts error:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to delete post' },
            { status: 500 }
        )
    }
}

export async function PATCH(
  request: NextRequest,
  context: { params?: { id?: string } | Promise<{ id: string }> }
) {
  try {
    const params = await Promise.resolve(context.params ?? {})
    const idFromUrl = params.id ?? new URL(request.url).searchParams.get('id')
    const id = idFromUrl

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid post ID' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const action = typeof body?.action === 'string' ? body.action : ''

    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Unsupported interaction action' },
        { status: 400 }
      )
    }

    const session = await auth.api.getSession({ headers: request.headers })
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const postId = new ObjectId(id)
    const post = await db.collection('posts').findOne({ _id: postId })

    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      )
    }

    if (action === 'like') {
      // like is deprecated – use highlight instead, but keep for backward compat
      // Map like -> highlight (highlightedBy) and clamp counts to 0
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'You must be signed in to like a post' },
          { status: 401 }
        )
      }
      const uid = String(session.user.id)
      const highlightedByArr: string[] = Array.isArray(post.highlightedBy) ? post.highlightedBy : Array.isArray(post.likedBy) ? post.likedBy : []
      const hasLiked = highlightedByArr.includes(uid)
      // clamp after update via normalizePost; also prevent negative likes with aggregation pipeline guard
      const result = await db.collection('posts').findOneAndUpdate(
        { _id: postId },
        hasLiked
          ? ({ $pull: { highlightedBy: uid } as any })
          : ({ $addToSet: { highlightedBy: uid } as any }),
        { returnDocument: 'after' }
      )
      // keep legacy likedBy in sync
      await db.collection('posts').updateOne(
        { _id: postId },
        hasLiked ? ({ $pull: { likedBy: uid } as any }) : ({ $addToSet: { likedBy: uid } as any })
      )
      // clamp likes field to 0 if needed
      const after = unwrap(result, post)
      const cnt = Array.isArray(after?.highlightedBy) ? after.highlightedBy.length : 0
      await db.collection('posts').updateOne({ _id: postId }, { $set: { likes: Math.max(0, cnt) } } as any)
      const fresh = await db.collection('posts').findOne({ _id: postId })
      return NextResponse.json({
        success: true,
        liked: !hasLiked,
        post: normalizePost(unwrap(fresh, after)),
      })
    }

    if (action === 'highlight') {
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'You must be signed in to highlight' },
          { status: 401 }
        )
      }
      const uid = String(session.user.id)
      const highlightedByArr: string[] = Array.isArray(post.highlightedBy) ? post.highlightedBy : Array.isArray(post.likedBy) ? post.likedBy : []
      const hasHighlighted = highlightedByArr.includes(uid)
      await db.collection('posts').updateOne(
        { _id: postId },
        hasHighlighted ? ({ $pull: { highlightedBy: uid } as any }) : ({ $addToSet: { highlightedBy: uid } as any })
      )
      await db.collection('posts').updateOne(
        { _id: postId },
        hasHighlighted ? ({ $pull: { likedBy: uid } as any }) : ({ $addToSet: { likedBy: uid } as any })
      )
      const upd = await db.collection('posts').findOne({ _id: postId })
      const cnt2 = Array.isArray(upd?.highlightedBy) ? upd.highlightedBy.length : 0
      await db.collection('posts').updateOne({ _id: postId }, { $set: { likes: Math.max(0, cnt2) } } as any)
      const fresh2 = await db.collection('posts').findOne({ _id: postId })
      return NextResponse.json({
        success: true,
        highlighted: !hasHighlighted,
        highlightCount: Math.max(0, cnt2),
        post: normalizePost(fresh2 as any),
      })
    }

    if (action === 'scrolled') {
      if (!session?.user?.id) {
        return NextResponse.json({ success: true, post: normalizePost(post) })
      }
      const uid = String(session.user.id)
      const already = Array.isArray(post.scrolled) && post.scrolled.includes(uid)
      if (already) {
        return NextResponse.json({ success: true, post: normalizePost(post) })
      }
      const today = new Date().toISOString().slice(0, 10)
      const field = `scrolledAt.${uid}`
      const result = await db.collection('posts').findOneAndUpdate(
        { _id: postId },
        { $addToSet: { scrolled: uid } as any, $set: { [field]: today } as any },
        { returnDocument: 'after' }
      )
      return NextResponse.json({ success: true, post: normalizePost(unwrap(result, post)) })
    }

    // -----------------------------------------------------------------
    // REACT: save (or remove) the signed-in user's emoji reaction.
    // Stored as post.reactions = { [userId]: emoji }
    // Sending the same emoji again removes the reaction.
    // -----------------------------------------------------------------
    if (action === 'react') {
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'You must be signed in to react' },
          { status: 401 }
        )
      }

      const userId = String(session.user.id)

      // Mongo field names can't contain "." or start with "$"
      if (!userId || userId.includes('.') || userId.startsWith('$')) {
        return NextResponse.json(
          { success: false, message: 'Invalid user ID' },
          { status: 400 }
        )
      }

      const emoji = typeof body.emoji === 'string' ? body.emoji.trim() : ''

      if (!emoji || !ALLOWED_REACTIONS.includes(emoji)) {
        return NextResponse.json(
          { success: false, message: 'Unsupported reaction' },
          { status: 400 }
        )
      }

      const existing =
        post.reactions && typeof post.reactions === 'object'
          ? (post.reactions as Record<string, string>)
          : {}

      const field = `reactions.${userId}`
      const remove = existing[userId] === emoji

      const result = await db.collection('posts').findOneAndUpdate(
        { _id: postId },
        remove
          ? { $unset: { [field]: '' } }
          : { $set: { [field]: emoji } },
        { returnDocument: 'after' }
      )

      const updated = unwrap(result, post)

      return NextResponse.json({
        success: true,
        emoji: remove ? null : emoji,
        reactions: updated?.reactions ?? {},
      })
    }

    if (action === 'comment') {
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'You must be signed in to comment' },
          { status: 401 }
        )
      }

      const commentText = typeof body.comment === 'string' ? body.comment.trim() : ''

      if (!commentText) {
        return NextResponse.json(
          { success: false, message: 'Comment text is required' },
          { status: 400 }
        )
      }
      if (commentText.length > 4000) {
        return NextResponse.json({ success: false, message: 'Comment is too long (max 4000 characters)' }, { status: 400 })
      }
      // prevent duplicate submission within short window (same user, same post, same text in last 10s)
      const recentDup = Array.isArray(post.commentsList)
        ? (post.commentsList as Record<string, unknown>[]).some((c) => {
            const sameContent = String(c.content ?? '').trim() === commentText
            const sameUser = String(c.userId ?? '') === String(session.user.id)
            const created = c.createdAt ? new Date(String(c.createdAt)) : null
            return sameContent && sameUser && created && Date.now() - created.getTime() < 10000
          })
        : false
      if (recentDup) {
        return NextResponse.json({ success: false, message: 'Duplicate comment detected. Please wait a moment.' }, { status: 429 })
      }

      const comment = {
        _id: new ObjectId(),
        userId: session.user.id,
        userName: session.user.name || 'Unknown user',
        userImage: session.user.image || null,
        content: commentText,
        createdAt: new Date(),
        likes: 0,
        likedBy: [],
        replies: [],
      }

      const result = await db.collection('posts').findOneAndUpdate(
        { _id: postId },
        {
          $push: { commentsList: comment } as any,
          $inc: { comments: 1 },
        },
        { returnDocument: 'after' }
      )

      return NextResponse.json({
        success: true,
        comment,
        post: normalizePost(unwrap(result, post)),
      })
    }

    if (action === 'like-comment') {
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'You must be signed in to like a comment' },
          { status: 401 }
        )
      }

      const commentId = typeof body.commentId === 'string' ? body.commentId : ''
      const replyId = typeof body.replyId === 'string' ? body.replyId : ''
      if (!commentId) {
        return NextResponse.json(
          { success: false, message: 'Comment ID is required' },
          { status: 400 }
        )
      }

      const commentsList = Array.isArray(post.commentsList) ? post.commentsList : []
      const targetIndex = commentsList.findIndex((comment) => String(comment._id) === String(commentId))

      if (targetIndex === -1) {
        return NextResponse.json(
          { success: false, message: 'Comment not found' },
          { status: 404 }
        )
      }

      const commentsWithUpdatedState = commentsList.map((comment, index) => {
        if (index !== targetIndex) return comment

        if (replyId) {
          const replies = Array.isArray(comment.replies) ? comment.replies : []
          const replyIndex = replies.findIndex((reply: Record<string, any>) => String(reply._id) === String(replyId))

          if (replyIndex === -1) {
            return comment
          }

          const targetReply = replies[replyIndex]
          const likedBy = Array.isArray(targetReply.likedBy) ? targetReply.likedBy : []
          const hasLiked = likedBy.includes(session.user.id)

          const nextReply = {
            ...targetReply,
            likes: Math.max(0, Number(targetReply.likes ?? 0) + (hasLiked ? -1 : 1)),
            likedBy: hasLiked
              ? likedBy.filter((id: string) => id !== session.user.id)
              : [...new Set([...likedBy, session.user.id])],
          }

          return {
            ...comment,
            replies: replies.map((reply: Record<string, any>, currentIndex: number) =>
              currentIndex === replyIndex ? nextReply : reply
            ),
          }
        }

        const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : []
        const hasLiked = likedBy.includes(session.user.id)

        return {
          ...comment,
          likes: Math.max(0, Number(comment.likes ?? 0) + (hasLiked ? -1 : 1)),
          likedBy: hasLiked
            ? likedBy.filter((id: string) => id !== session.user.id)
            : [...new Set([...likedBy, session.user.id])],
        }
      })

      const result = await db.collection('posts').findOneAndUpdate(
        { _id: postId },
        { $set: { commentsList: commentsWithUpdatedState } },
        { returnDocument: 'after' }
      )

      return NextResponse.json({
        success: true,
        comment: commentsWithUpdatedState[targetIndex],
        post: normalizePost(unwrap(result, post)),
      })
    }

    if (action === 'reply-comment') {
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'You must be signed in to reply to a comment' },
          { status: 401 }
        )
      }

      const commentId = typeof body.commentId === 'string' ? body.commentId : ''
      const replyText = typeof body.reply === 'string' ? body.reply.trim() : ''

      if (!commentId || !replyText) {
        return NextResponse.json(
          { success: false, message: 'Reply text and comment ID are required' },
          { status: 400 }
        )
      }
      if (replyText.length > 3000) {
        return NextResponse.json({ success: false, message: 'Reply is too long (max 3000 characters)' }, { status: 400 })
      }
      // optional replyTo username
      const replyToNameRaw = typeof body.replyTo === 'string' ? body.replyTo.trim().slice(0, 120) : ''
      const recentReplyDup = (() => {
        const commentsList = Array.isArray(post.commentsList) ? post.commentsList : []
        const target = (commentsList as Record<string, unknown>[]).find((c) => String((c as Record<string, unknown>)._id) === String(commentId))
        if (!target || !Array.isArray((target as Record<string, unknown>).replies)) return false
        const replies = (target as Record<string, unknown>).replies as Record<string, unknown>[]
        return replies.some((r) => {
          const sameContent = String(r.content ?? '').trim() === replyText
          const sameUser = String(r.userId ?? '') === String(session.user.id)
          const created = r.createdAt ? new Date(String(r.createdAt)) : null
          return sameContent && sameUser && created && Date.now() - created.getTime() < 10000
        })
      })()
      if (recentReplyDup) {
        return NextResponse.json({ success: false, message: 'Duplicate reply detected. Please wait a moment.' }, { status: 429 })
      }

      const commentsList = Array.isArray(post.commentsList) ? post.commentsList : []
      const targetIndex = commentsList.findIndex((comment) => String(comment._id) === String(commentId))

      if (targetIndex === -1) {
        return NextResponse.json(
          { success: false, message: 'Comment not found' },
          { status: 404 }
        )
      }

      const reply = {
        _id: new ObjectId(),
        userId: session.user.id,
        userName: session.user.name || 'Unknown user',
        userImage: session.user.image || null,
        replyTo: replyToNameRaw ? { userName: replyToNameRaw } : null,
        content: replyText,
        createdAt: new Date(),
        likes: 0,
        likedBy: [],
      }

      const updatedComments = commentsList.map((comment, index) => {
        if (index !== targetIndex) return comment

        return {
          ...comment,
          replies: Array.isArray(comment.replies) ? [...comment.replies, reply] : [reply],
        }
      })

      const result = await db.collection('posts').findOneAndUpdate(
        { _id: postId },
        { $set: { commentsList: updatedComments } },
        { returnDocument: 'after' }
      )

      return NextResponse.json({
        success: true,
        reply,
        post: normalizePost(unwrap(result, post)),
      })
    }

    if (action === 'view') {
      if (!session?.user?.id) {
        return NextResponse.json({
          success: true,
          post: normalizePost(post),
        })
      }

      // $addToSet prevents duplicate views from inflating the count — idempotent per user
      const result = await db.collection('posts').findOneAndUpdate(
        { _id: postId },
        { $addToSet: { opened: session.user.id } as any },
        { returnDocument: 'after' }
      )

      return NextResponse.json({
        success: true,
        post: normalizePost(unwrap(result, post)),
      })
    }

    if (action === 'reshare') {
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'You must be signed in to reshare' },
          { status: 401 }
        )
      }

      const rawDesc = typeof body?.reshareDescription === "string" ? body.reshareDescription.trim() : ""
      const reshareDescription = rawDesc.slice(0, 5000)
      // If this post is itself a reshare, keep pointing to the ultimate original
      const ultimateOriginalId = post.reshareData?.originalPostId || id
      const ultimateContent = post.reshareData?.originalContent ?? post.content
      const ultimateImages = Array.isArray(post.reshareData?.originalImages) ? post.reshareData.originalImages : Array.isArray(post.images) ? post.images : []
      const ultimateUserName = post.reshareData?.originalUserName ?? post.userName
      const ultimateUserImage = post.reshareData?.originalUserImage ?? post.userImage
      const ultimateUserId = post.reshareData?.originalUserId ?? post.userId
      const ultimateUserHandle = (post.reshareData as any)?.originalUserHandle ?? (post as any).userHandle ?? null

      let resharerHandle = null
      try {
        const uu = await db.collection('user').findOne({ id: session.user.id } as any, { projection: { userHandle: 1 } } as any)
        resharerHandle = (uu as any)?.userHandle || null
        if (!resharerHandle) {
          const { ObjectId: OID2 } = await import('mongodb')
          if (OID2.isValid(session.user.id)) {
            const uu2 = await db.collection('user').findOne({ _id: new OID2(session.user.id) } as any, { projection: { userHandle: 1 } } as any)
            resharerHandle = (uu2 as any)?.userHandle || null
          }
        }
      } catch {}
      const reshare = {
        content: reshareDescription,
        images: Array.isArray(post.images) ? post.images : [],
        userId: session.user.id,
        userName: session.user.name || 'Unknown user',
        userImage: session.user.image || null,
        userHandle: resharerHandle || null,
        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: [],
        highlightedBy: [],
        scrolled: [],
        scrolledAt: {},
        opened: [],
        reactions: {},
        reshareOf: ultimateOriginalId,
        reshareCount: 0,
        reshareData: {
          originalPostId: ultimateOriginalId,
          originalContent: ultimateContent,
          originalImages: ultimateImages,
          originalUserName: ultimateUserName || 'Unknown user',
          originalUserImage: ultimateUserImage || null,
          originalUserId: ultimateUserId,
          originalUserHandle: ultimateUserHandle || null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await db.collection('posts').insertOne(reshare)

      await db.collection('posts').updateOne(
        { _id: postId },
        { $inc: { reshareCount: 1 } }
      )

      return NextResponse.json({
        success: true,
        post: normalizePost({ ...reshare, _id: result.insertedId }),
      })
    }

    // action === 'share'
    const result = await db.collection('posts').findOneAndUpdate(
      { _id: postId },
      { $inc: { shares: 1 } },
      { returnDocument: 'after' }
    )

    return NextResponse.json({
      success: true,
      post: normalizePost(unwrap(result, post)),
    })
  } catch (error) {
    console.error('PATCH /api/posts/[id] error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update post interaction',
      },
      {
        status: 500,
      }
    )
  }
}