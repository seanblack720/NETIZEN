import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const profileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    bio: { type: String, default: "", maxlength: 500 },
    location: { type: String, default: "", maxlength: 160 },
    phone: { type: String, default: "", maxlength: 40 },
    birthDate: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    isPro: { type: Boolean, default: false },
    proApprovedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "profiles", timestamps: false, versionKey: false }
);

export const Profile = getOrCreateModel<any>("Profile", profileSchema);

export default Profile;
