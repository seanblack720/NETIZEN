import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI in your environment variables.");
}

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

const client =
  globalThis._mongoClient ?? new MongoClient(uri, options);

if (process.env.NODE_ENV !== "production") {
  globalThis._mongoClient = client;
}

export function getMongoDb(): Db {
  return client.db(
    process.env.MONGODB_DB_NAME || "netizen"
  );
}

export default client;
