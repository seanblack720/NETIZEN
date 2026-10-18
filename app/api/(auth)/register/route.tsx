// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectMongoose, User } from "@/lib/mongoose";

const MIN_AGE = 13;
const MAX_AGE = 120;
const MAX_INTERESTS = 80;
const MAX_IMAGE_LENGTH = 400_000; // base64 data URL of the 320px profile photo is well under this
const GENDERS = ["Male", "Female", "Prefer not to say"];

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

/** Whole years since a "YYYY-MM-DD" date, or null if the value is not a real date. */
function ageFromBirthDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  const dob = new Date(year, month, day);
  if (dob.getFullYear() !== year || dob.getMonth() !== month || dob.getDate() !== day) return null;

  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() < month || (now.getMonth() === month && now.getDate() < day)) age -= 1;
  return age;
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return fail("Invalid request body");
    }

    /* ---- required basics ---- */
    const name = str(body.name).slice(0, 120);
    const email = str(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return fail("Name, email, and password are required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail("Please enter a valid email address");
    }
    if (password.length < 8) {
      return fail("Password must be at least 8 characters");
    }
    if (password.length > 72) {
      return fail("Password must be 72 characters or fewer");
    }

    /* ---- identity ---- */
    const username = (str(body.username) || name).toLowerCase().replace(/\s+/g, "").slice(0, 40);

    const handleBase = String(body.userHandle || username)
      .toLowerCase()
      .replace(/^@/, "")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);

    if (handleBase.length < 2) {
      return fail("Please choose a user handle with at least 2 letters or numbers");
    }
    const userHandle = `@${handleBase}`;

    /* ---- date of birth (age is always calculated here, never trusted from the client) ---- */
    const birthDate = str(body.birthDate);
    const age = ageFromBirthDate(birthDate);

    if (age === null) {
      return fail("Please enter a valid date of birth");
    }
    if (age < MIN_AGE) {
      return fail(`You must be at least ${MIN_AGE} years old to join Netizen`);
    }
    if (age > MAX_AGE) {
      return fail("Please check your date of birth");
    }

    /* ---- profile details ---- */
    const gender = GENDERS.includes(str(body.gender)) ? str(body.gender) : "";
    const country = str(body.country).slice(0, 80);
    const phone = str(body.phone).slice(0, 40);
    const uiMode = body.uiMode === "dark" ? "dark" : "light";

    /* ---- interests ---- */
    const interests: string[] = Array.isArray(body.interests)
      ? Array.from(
          new Set(
            body.interests
              .filter((item): item is string => typeof item === "string")
              .map((item) => item.trim().toLowerCase())
              .filter((item) => /^[a-z0-9-]{2,40}$/.test(item))
          )
        ).slice(0, MAX_INTERESTS)
      : [];

    /* ---- profile photo (optional): base64 data URL string ---- */
    const rawImage = typeof body.image === "string" ? body.image : "";
    if (rawImage && (!rawImage.startsWith("data:image/") || rawImage.length > MAX_IMAGE_LENGTH)) {
      return fail("That profile photo is invalid or too large");
    }

    await connectMongoose();

    /* ---- uniqueness ---- */
    const existing = await User.findOne({
      $or: [{ email }, { userHandle: { $in: [userHandle, handleBase] } }, { username }],
    })
      .select("email userHandle username")
      .lean();

    if (existing) {
      const taken = existing as { email?: string; userHandle?: string; username?: string };

      if (taken.email === email) return fail("That email is already registered", 409);
      if (taken.userHandle === userHandle || taken.userHandle === handleBase) {
        return fail("That user handle is already taken", 409);
      }
      return fail("That username is already taken", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();

    const user = await User.create({
      name,
      username,
      userHandle,
      email,
      phone,
      birthDate,
      age,
      gender,
      country,
      interests,
      uiMode,
      password: hashedPassword,
      image: rawImage,
      avatar: "/avatar-2.png",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: {
          id: String(user._id),
          name: user.name,
          username: user.username,
          userHandle: user.userHandle,
          email: user.email,
          avatar: user.avatar,
          interests: user.interests,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Two people grabbing the same handle/email/username at the same moment
    if ((error as { code?: number })?.code === 11000) {
      return fail("That email, handle or username was just taken. Please try another", 409);
    }

    console.error("Registration error:", error);
    return fail("Failed to create account", 500);
  }
}