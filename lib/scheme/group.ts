import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 500 },
    category: { type: String, default: "", maxlength: 60 },
    image: { type: String, default: "" },
    ownerId: { type: String, required: true, index: true },
    ownerName: { type: String, default: "Netizen member" },
    memberIds: [{ type: String }],
    members: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "groups", timestamps: false, versionKey: false }
);

export const Group = getOrCreateModel<any>("Group", groupSchema);

export default Group;
