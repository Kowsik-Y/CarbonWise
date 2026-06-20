import { NextRequest, NextResponse } from "next/server";
import { userRepository } from "@/repositories/user.repository";
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "@/services/auth";
import { getUserProfile, createUserProfile } from "@/services/db-service";
import { cookies } from "next/headers";
import { z } from "zod";
import { handleApiError, ValidationError, UnauthorizedError, RateLimitError } from "@/lib/errors";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(1, "Password is required").optional(),
  idToken: z.string().optional(),
});

// sliding window rate limiter
const failedAttemptsMap = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const fifteenMinutesAgo = now - 15 * 60 * 1000;
  
  let attempts = failedAttemptsMap.get(key) || [];
  attempts = attempts.filter((t) => t > fifteenMinutesAgo);
  failedAttemptsMap.set(key, attempts);
  
  return attempts.length >= 5;
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const attempts = failedAttemptsMap.get(key) || [];
  attempts.push(now);
  failedAttemptsMap.set(key, attempts);
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "test" && req.headers.get("x-reset-rate-limit")) {
      failedAttemptsMap.clear();
      return NextResponse.json({ ok: true });
    }

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

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "127.0.0.1";

    if (isRateLimited(email) || isRateLimited(ip)) {
      throw new RateLimitError("Too many failed login attempts. Please try again later.");
    }

    // Find user
    const user = await userRepository.getUserByEmail(email);

    if (!user) {
      recordFailedAttempt(ip);
      recordFailedAttempt(email);
      throw new UnauthorizedError("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!isPasswordValid) {
      recordFailedAttempt(ip);
      recordFailedAttempt(email);
      throw new UnauthorizedError("Invalid email or password");
    }

    // Clear attempts on success
    failedAttemptsMap.delete(ip);
    failedAttemptsMap.delete(email);

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
