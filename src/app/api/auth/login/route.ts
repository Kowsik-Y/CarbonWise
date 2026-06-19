import { NextRequest, NextResponse } from "next/server";
import { userRepository } from "@/repositories/user.repository";
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "@/services/auth";
import { getUserProfile, createUserProfile } from "@/services/db-service";
import { cookies } from "next/headers";
import { z } from "zod";
import { handleApiError, ValidationError, UnauthorizedError } from "@/lib/errors";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(1, "Password is required").optional(),
  idToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      const errorMsg = result.error.issues.map((i) => i.message).join(", ");
      throw new ValidationError(errorMsg);
    }

    const { email, password, idToken } = result.data;
    const isFirebase = !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    if (isFirebase && idToken) {
      // Firebase flow
      const payload = await verifyToken(idToken);
      if (!payload) {
        throw new UnauthorizedError("Invalid Firebase ID token");
      }

      let profile = await getUserProfile(payload.userId);
      if (!profile) {
        // Fallback profile creation if not created on signup
        profile = await createUserProfile(payload.userId, { 
          name: payload.email ? payload.email.split("@")[0] : "Eco Hero", 
          email: payload.email || "" 
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

      return NextResponse.json({ user: profile });
    }

    // SQLite / Prisma Flow
    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    // Find user
    const user = await userRepository.getUserByEmail(email);

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

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

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        points: user.points,
        level: user.level,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
