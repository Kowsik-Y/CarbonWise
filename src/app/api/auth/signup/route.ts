import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "@/services/auth";
import { createUserProfile, getUserProfile } from "@/services/db-service";
import { cookies } from "next/headers";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  idToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      const errorMsg = result.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { name, email, password, idToken } = result.data;
    const isFirebase = !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    if (isFirebase && idToken) {
      const payload = await verifyToken(idToken);
      if (!payload) {
        return NextResponse.json({ error: "Invalid Firebase ID token" }, { status: 401 });
      }

      let profile = await getUserProfile(payload.userId);
      if (!profile) {
        profile = await createUserProfile(payload.userId, {
          name: name || (payload.email ? payload.email.split("@")[0] : "Eco Hero"),
          email: email || payload.email || "",
        });
      }

      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set({
        name: "token",
        value: idToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return NextResponse.json({ user: profile }, { status: 201 });
    }

    // Custom SQL / Prisma signup flow
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    // Generate JWT token
    const token = await signToken({ userId: user.id, email: user.email });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          points: user.points,
          level: user.level,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup route error:", error);
    return NextResponse.json(
      { error: "Something went wrong during signup" },
      { status: 500 }
    );
  }
}
