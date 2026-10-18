import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { nextCookies } from "better-auth/next-js";
import { betterAuth } from "better-auth";

import { getMongoDb } from "@/lib/mongodb";

const secret = process.env.BETTER_AUTH_SECRET;

if (!secret) {
  throw new Error("Missing BETTER_AUTH_SECRET in your environment variables.");
}

export const auth = betterAuth({
  appName: "Netizen",
  secret,
  database: mongodbAdapter(getMongoDb()),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  plugins: [nextCookies()],
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
  trustedOrigins: [
    "http://localhost:3000",
    process.env.NEXT_PUBLIC_APP_URL ?? "",
    process.env.V0_RUNTIME_URL ?? "",
    process.env.V0_DEV_APP_URL ?? "",
    process.env.V0_BUILD_URL ?? "",
    process.env.V0_SANDBOX_URL ?? "",
  ].filter(Boolean),
});
