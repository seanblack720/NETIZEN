import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "MONGODB_URI is not defined"
  );
}

const client = new MongoClient(uri);

export async function POST(
  request: NextRequest
) {
  try {
    const {
      name,
      username,
      email,
      password,
    } = await request.json();

    if (
      !name ||
      !username ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "All fields are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be at least 8 characters",
        },
        { status: 400 }
      );
    }

    await client.connect();

    const db = client.db("netizen");

    const users =
      db.collection("users");

    const existingUser =
      await users.findOne({
        $or: [
          {
            email:
              email.toLowerCase(),
          },
          {
            username:
              username.toLowerCase(),
          },
        ],
      });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email or username is already registered",
        },
        { status: 409 }
      );
    }

    const hashedPassword =
      await bcrypt.hash(password, 12);

    const user = {
      name: name.trim(),
      username:
        username.trim().toLowerCase(),
      email:
        email.trim().toLowerCase(),
      password: hashedPassword,
      avatar: "/avatar-2.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result =
      await users.insertOne(user);

    return NextResponse.json(
      {
        success: true,
        message:
          "Account created successfully",
        user: {
          id: result.insertedId,
          name: user.name,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to create account",
      },
      { status: 500 }
    );
  }
}
