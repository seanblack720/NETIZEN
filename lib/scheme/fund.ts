import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const fundSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 2500 },
    goal: { type: Number, default: 0 },
    raised: { type: Number, default: 0 },
    createdBy: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "funds", timestamps: false, versionKey: false }
);

export const Fund = getOrCreateModel<any>("Fund", fundSchema);

export default Fund;
