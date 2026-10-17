import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const highlightSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    postId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "highlights", timestamps: false, versionKey: false }
);

highlightSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const Highlight = getOrCreateModel<any>("Highlight", highlightSchema);

export default Highlight;
