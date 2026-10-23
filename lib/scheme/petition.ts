import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const petitionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 2500 },
    createdBy: { type: String, required: true, index: true },
    supporters: [{ type: String }],
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "petitions", timestamps: false, versionKey: false }
);

export const Petition = getOrCreateModel<any>("Petition", petitionSchema);

export default Petition;
