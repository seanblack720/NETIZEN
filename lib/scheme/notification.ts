import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const notificationSchema = new Schema(
  {
    senderId: { type: String, required: true, index: true },
    receiverId: { type: String, index: true },
    creatorId: { type: String, index: true },
    userId: { type: String, index: true },
    actorId: { type: String, index: true },
    actorName: { type: String, default: "Someone" },
    actorImage: { type: String, default: null },
    type: {
      type: String,
      enum: [
        "post-reaction",
        "comment",
        "reply",
        "mention",
        "comment-reaction",
        "reply-reaction",
        "post-like",
        "post-comment",
        "comment-like",
        "reply-like",
      ],
      required: true,
    },
    postId: { type: String, default: null },
    commentId: { type: String, default: null },
    replyId: { type: String, default: null },
    message: { type: String, required: true },
    link: { type: String, default: null },
    read: { type: Boolean, default: false },
    seen: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "notifications", timestamps: false, versionKey: false }
);

export const Notification = getOrCreateModel<any>("Notification", notificationSchema);

export default Notification;
