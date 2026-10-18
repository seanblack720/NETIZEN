import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const userSchema = new Schema(
  {
    id: { type: String, index: true },
    name: { type: String, trim: true, maxlength: 120 },
    userHandle: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    AnonString: { type: String, default: "" },
    // "" for accounts created before display mode was collected
    uiMode: { type: String, enum: ["", "light", "dark"], default: "" },
    // Topic ids picked on the register page's interests wall, e.g. ["local-news", "taxis"]
    interests: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
      default: [],
      validate: [(value: string[]) => value.length <= 80, "Too many interests"],
    },
    savedPosts: [{ type: String }],
    highlightedPosts: [{ type: String }],
    addedNetizens: [{ type: String }],
    Following: [{ type: String }],
    Followers: [{ type: String }],
    AddedNetizensPosts: [{ type: String }],
    followingPost: [{ type: String }],
    // Calculated by the server from birthDate when the account is created
    age: { type: Number, min: 0, max: 120 },
    // Stored as "YYYY-MM-DD". Empty for accounts created before date of birth was collected
    birthDate: {
      type: String,
      default: "",
      trim: true,
      match: [/^(\d{4}-\d{2}-\d{2})?$/, "birthDate must be in YYYY-MM-DD format"],
    },
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
    avatar: { type: String, default: "" },
    role: { type: String, default: "user" },
    isPro: { type: Boolean, default: false },
    bio: { type: String, default: "", maxlength: 500 },
    location: { type: String, default: "", maxlength: 160 },
    phone: { type: String, default: "", maxlength: 40 },
    coverImage: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "user", timestamps: false, versionKey: false }
);

// Multikey index so you can query users (or build feeds) by topic quickly
userSchema.index({ interests: 1 });

export const User = getOrCreateModel<any>("User", userSchema);

export default User;