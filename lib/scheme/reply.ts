import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const replySchema = new Schema(
  {
    postId: { type: String, index: true },
    commentId: { type: String, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true, trim: true, maxlength: 120 },
    userImage: { type: String, default: null },
    replyTo: {
      userId: { type: String, default: "" },
      userName: { type: String, default: "" },
    },
    content: { type: String, required: true, trim: true, maxlength: 3000 },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: String }],
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "replies", timestamps: false, versionKey: false }
);

export const Reply = getOrCreateModel<any>("Reply", replySchema);

export default Reply;
