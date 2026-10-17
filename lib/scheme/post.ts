import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const postSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true, trim: true, maxlength: 120 },
    userImage: { type: String, default: null },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    images: [{ type: String }],
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    likedBy: [{ type: String }],
    opened: [{ type: String }],
    reshareOf: { type: String, default: null },
    reshareCount: { type: Number, default: 0 },
    reshareData: { type: Schema.Types.Mixed, default: null },
    commentsList: [{ type: Schema.Types.Mixed }],
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "posts", timestamps: false, versionKey: false }
);

export const Post = getOrCreateModel<any>("Post", postSchema);

export default Post;
