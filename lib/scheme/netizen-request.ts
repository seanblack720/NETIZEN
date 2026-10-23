import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const netizenRequestSchema = new Schema(
  {
    fromUserId: { type: String, required: true, index: true },
    toUserId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true,
    },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "netizenRequests", timestamps: false, versionKey: false }
);

// One pending request per pair of users
netizenRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

export const NetizenRequest = getOrCreateModel<any>(
  "NetizenRequest",
  netizenRequestSchema
);

export default NetizenRequest;
