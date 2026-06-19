import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/services/auth";

export interface AuthenticatedContext {
  userId: string;
  email: string;
  params: any;
}

export type AuthenticatedHandler = (
  req: NextRequest,
  context: AuthenticatedContext
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function to wrap Next.js API route handlers with Authentication checks.
 * Resolves cookie tokens (Firebase or Custom JWT) and exposes authenticated context to handlers.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context?: { params?: Promise<any> | any }) => {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("token")?.value;

      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const payload = await verifyToken(token);
      if (!payload) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Next.js params can be a Promise or raw object depending on environment
      let resolvedParams = {};
      if (context && context.params) {
        resolvedParams = typeof context.params.then === "function" 
          ? await context.params 
          : context.params;
      }

      const authCtx: AuthenticatedContext = {
        userId: payload.userId,
        email: payload.email || "",
        params: resolvedParams,
      };

      return await handler(req, authCtx);
    } catch (error) {
      console.error("Auth proxy error:", error);
      return NextResponse.json(
        { error: "Something went wrong during authorization check" },
        { status: 500 }
      );
    }
  };
}
