import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const userSchema = new Schema(
  {
    id: { type: String, index: true },
    name: { type: String, trim: true, maxlength: 120 },
    userHandle: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    AnonString: { type: String, default: "" },
    uiMode: { type: String, default: "" },
    savedPosts: [{ type: String }],
    highlightedPosts: [{ type: String }],
    addedNetizens: [{ type: String }],
    Following: [{ type: String }],
    Followers: [{ type: String }],
    AddedNetizensPosts: [{ type: String }],
    followingPost: [{ type: String }],
    age: { type: Number },
    gender: { type: String, default: "" },
    country: { type: String, default: "" },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      index: true,
    },
    email: { type: String, trim: true, lowercase: true, index: true },
    password: { type: String, default: "" },
    emailVerified: { type: Boolean, default: false },
    image: { type: String, default: "" },
    avatar: { type: String, default: "/avatar-2.png" },
    role: { type: String, default: "user" },
    isPro: { type: Boolean, default: false },
    bio: { type: String, default: "", maxlength: 500 },
    location: { type: String, default: "", maxlength: 160 },
    phone: { type: String, default: "", maxlength: 40 },
    birthDate: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "user", timestamps: false, versionKey: false }
);

export const User = getOrCreateModel<any>("User", userSchema);

export default User;
