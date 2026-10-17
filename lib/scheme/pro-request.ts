import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const proRequestSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: "Unknown user" },
    userEmail: { type: String, default: "" },
    reason: { type: String, default: "", maxlength: 600 },
    amount: { type: Number, default: 200 },
    currency: { type: String, default: "ZAR" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    createdAt: { type: Date, default: Date.now, index: true },
    reviewedAt: { type: Date },
  },
  { collection: "proRequests", timestamps: false, versionKey: false }
);

export const ProRequest = getOrCreateModel<any>("ProRequest", proRequestSchema);

export default ProRequest;
