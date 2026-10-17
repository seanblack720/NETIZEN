import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectMongoose, User } from "@/lib/mongoose";

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      username,
      userHandle,
      email,
      phone,
      age,
      gender,
      country,
      password,
      AnonString,
    } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await connectMongoose();

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = (username || name).trim().toLowerCase().replace(/\s+/g, "");
    const normalizedHandle = (userHandle || "@user").trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { userHandle: normalizedHandle }],
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email or user handle is already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: String(name).trim(),
      username: normalizedUsername,
      userHandle: normalizedHandle,
      email: normalizedEmail,
      phone: phone || "",
      age: age ? Number(age) : undefined,
      gender: gender || "",
      country: country || "",
      password: hashedPassword,
      avatar: "/avatar-2.png",
      createdAt: new Date(),
      updatedAt: new Date(),
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
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create account" },
      { status: 500 }
    );
  }
}
