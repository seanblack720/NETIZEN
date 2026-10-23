import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const jobSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    company: { type: String, default: "", maxlength: 120 },
    location: { type: String, default: "", maxlength: 120 },
    description: { type: String, default: "", maxlength: 2000 },
    postedBy: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "jobs", timestamps: false, versionKey: false }
);

export const Job = getOrCreateModel<any>("Job", jobSchema);

export default Job;
