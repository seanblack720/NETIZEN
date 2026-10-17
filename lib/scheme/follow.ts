import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const followSchema = new Schema(
  {
    followerId: { type: String, required: true, index: true },
    followingId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "follows", timestamps: false, versionKey: false }
);

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export const Follow = getOrCreateModel<any>("Follow", followSchema);

export default Follow;
