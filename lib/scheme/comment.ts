import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const commentSchema = new Schema(
  {
    postId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true, trim: true, maxlength: 120 },
    userImage: { type: String, default: null },
    content: { type: String, required: true, trim: true, maxlength: 4000 },
    images: [{ type: String }],
    likes: { type: Number, default: 0 },
    likedBy: [{ type: String }],
    replies: [{ type: Schema.Types.Mixed }],
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "comments", timestamps: false, versionKey: false }
);

export const Comment = getOrCreateModel<any>("Comment", commentSchema);

export default Comment;
