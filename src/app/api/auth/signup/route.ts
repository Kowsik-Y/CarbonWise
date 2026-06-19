import { NextRequest, NextResponse } from "next/server";
import { userRepository } from "@/repositories/user.repository";
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "@/services/auth";
import { createUserProfile, getUserProfile } from "@/services/db-service";
import { cookies } from "next/headers";
import { z } from "zod";
import { handleApiError, ValidationError, UnauthorizedError, ConflictError } from "@/lib/errors";

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
      throw new ValidationError(errorMsg);
    }

    const { name, email, password, idToken } = result.data;
    const isFirebase = !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    if (isFirebase && idToken) {
      const payload = await verifyToken(idToken);
      if (!payload) {
        throw new UnauthorizedError("Invalid Firebase ID token");
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
      throw new ValidationError("Name, email and password are required");
    }

    // Check if user already exists
    const existingUser = await userRepository.getUserByEmail(email);

    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await userRepository.createUser({
      name,
      email,
      passwordHash,
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
    return handleApiError(error);
  }
}
