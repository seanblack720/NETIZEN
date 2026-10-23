import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const videoSchema = new Schema(
  {
    title: { type: String, default: "Video", maxlength: 160 },
    url: { type: String, required: true, maxlength: 2048 },
    createdBy: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "videos", timestamps: false, versionKey: false }
);

export const Video = getOrCreateModel<any>("Video", videoSchema);

export default Video;
