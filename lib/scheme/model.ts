import mongoose, { Schema, type Model } from "mongoose";

const modelCache = globalThis as typeof globalThis & {
  __netizenSchemas?: Record<string, Model<any>>;
};

export const getOrCreateModel = <T>(name: string, schema: Schema<T>) => {
  const cache = modelCache.__netizenSchemas ?? {};
  modelCache.__netizenSchemas = cache;

  return (cache[name] ??= mongoose.model<T>(name, schema));
};
