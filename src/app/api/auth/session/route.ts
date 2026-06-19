import { NextResponse } from "next/server";
import { verifyToken } from "@/services/auth";
import { getUserProfile } from "@/services/db-service";
import { cookies } from "next/headers";
import { handleApiError, UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      throw new UnauthorizedError("No token found");
    }

    const payload = await verifyToken(token);
    if (!payload) {
      throw new UnauthorizedError("Invalid token");
    }

    const user = await getUserProfile(payload.userId);

    if (!user) {
      throw new UnauthorizedError("User profile not found");
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
