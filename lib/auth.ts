import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { nextCookies } from "better-auth/next-js";
import { betterAuth } from "better-auth";

import { getMongoDb } from "@/lib/mongodb";

const secret = process.env.BETTER_AUTH_SECRET;

if (!secret) {
  throw new Error("Missing BETTER_AUTH_SECRET in your environment variables.");
}

const originFromUrl = (value?: string) => {
  if (!value) return undefined;

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
};

const developmentOrigins = [
  "http://localhost:3000",
  process.env.V0_RUNTIME_URL,
  process.env.V0_DEV_APP_URL,
  process.env.V0_BUILD_URL,
  process.env.V0_SANDBOX_URL,
].map(originFromUrl).filter((origin): origin is string => Boolean(origin));

const productionOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
].map((value) => originFromUrl(value ? `https://${value}` : undefined)).filter(
  (origin): origin is string => Boolean(origin),
);

const trustedOrigins = [
  ...(process.env.NODE_ENV === "development" ? developmentOrigins : productionOrigins),
  originFromUrl(process.env.NEXT_PUBLIC_APP_URL),
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  appName: "Netizen",
  secret,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  database: mongodbAdapter(getMongoDb()),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  plugins: [nextCookies()],
  trustedOrigins,
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
});
