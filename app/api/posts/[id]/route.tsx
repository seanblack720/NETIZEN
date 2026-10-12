import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { auth } from '@/lib/auth'
import { ObjectId } from 'mongodb'

const DB_NAME = 'netizen'
const MAX_IMAGES = 4
const MAX_IMAGE_STRING_LENGTH = 7_000_000

function normalizePost(post: Record<string, any>) {
  if (!post) return null

  const id = post._id ? String(post._id) : null

  return {
    ...post,
    id,
    _id: id,
  }
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

    if (!['like', 'comment', 'reply-comment', 'like-comment', 'share'].includes(action)) {
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
      if (!session?.user) {
        return NextResponse.json(
          { success: false, message: 'You must be signed in to like a post' },
          { status: 401 }
        )
      }

      const likedBy = Array.isArray(post.likedBy) ? post.likedBy : []
      const hasLiked = likedBy.includes(session.user.id)

      const updateOps = hasLiked
        ? {
            $pull: { likedBy: session.user.id } as any,
            $inc: { likes: -1 },
          }
        : {
            $addToSet: { likedBy: session.user.id } as any,
            $inc: { likes: 1 },
          }

      const result = await db.collection('posts').findOneAndUpdate(
        { _id: postId },
        updateOps as any,
        { returnDocument: 'after' }
      )

      const updatedPost = normalizePost(result?.value ?? post)

      return NextResponse.json({
        success: true,
        liked: !hasLiked,
        post: updatedPost,
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
        post: normalizePost(result?.value ?? post),
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

      const targetComment = commentsList[targetIndex]
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
            likes: Number(targetReply.likes ?? 0) + (hasLiked ? -1 : 1),
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
          likes: Number(comment.likes ?? 0) + (hasLiked ? -1 : 1),
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
        post: normalizePost(result?.value ?? post),
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

      const commentsList = Array.isArray(post.commentsList) ? post.commentsList : []
      const targetIndex = commentsList.findIndex((comment) => String(comment._id) === String(commentId))

      if (targetIndex === -1) {
        return NextResponse.json(
          { success: false, message: 'Comment not found' },
          { status: 404 }
        )
      }

      const targetComment = commentsList[targetIndex]
      const reply = {
        _id: new ObjectId(),
        userId: session.user.id,
        userName: session.user.name || 'Unknown user',
        userImage: session.user.image || null,
        content: replyText,
        createdAt: new Date(),
        likes: 0,
        likedBy: [],
        replies: [],
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
        post: normalizePost(result?.value ?? post),
      })
    }

    const result = await db.collection('posts').findOneAndUpdate(
      { _id: postId },
      { $inc: { shares: 1 } },
      { returnDocument: 'after' }
    )

    return NextResponse.json({
      success: true,
      post: normalizePost(result?.value || post),
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