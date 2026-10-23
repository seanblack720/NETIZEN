import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const statusSchema = new Schema(
  {
    image: { type: String, required: true },
    title: { type: String, default: "New status", maxlength: 120 },
    tag: { type: String, default: "Update", maxlength: 24 },
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: "Netizen" },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "statuses", timestamps: false, versionKey: false }
);

export const Status = getOrCreateModel<any>("Status", statusSchema);

export default Status;
