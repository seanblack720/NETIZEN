import mongoose, { Schema, type Model } from "mongoose";
import {
  User,
  Profile,
  Follow,
  Comment,
  Reply,
  Post,
  Notification,
  Group,
  TaxiSpot,
  Status,
  ProRequest,
  Message,
  Job,
  Petition,
  Fund,
  Video,
} from "@/lib/scheme";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI in your environment variables.");
}

const dbName = process.env.MONGODB_DB_NAME || "netizen";

declare global {
  // eslint-disable-next-line no-var
  var __mongooseModels: Record<string, Model<any>> | undefined;
}

const models = globalThis.__mongooseModels ?? {};
globalThis.__mongooseModels = models;

export async function connectMongoose() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  await mongoose.connect(uri!, {
    dbName,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose;
}

export {
  User,
  Profile,
  Follow,
  Comment,
  Reply,
  Post,
  Notification,
  Group,
  TaxiSpot,
  Status,
  ProRequest,
  Message,
  Job,
  Petition,
  Fund,
  Video,
};

export default {
  connectMongoose,
  User,
  Profile,
  Follow,
  Comment,
  Reply,
  Post,
  Notification,
  Group,
  TaxiSpot,
  Status,
  ProRequest,
  Message,
  Job,
  Petition,
  Fund,
  Video,
};
