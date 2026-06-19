import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export interface AuthenticatedContext {
  userId: string;
  email: string;
  params: Record<string, string | string[]> | undefined;
}

export type AuthenticatedHandler = (
  req: NextRequest,
  context: AuthenticatedContext
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function to wrap Next.js API route handlers with Authentication checks.
 * Exposes the authenticated context injected by the global proxy middleware.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context?: { params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]> }) => {
    try {
      const userId = req.headers.get("x-user-id");
      const email = req.headers.get("x-user-email") || "";

      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Next.js params can be a Promise or raw object depending on environment
      let resolvedParams: Record<string, string | string[]> = {};
      if (context && context.params) {
        resolvedParams = typeof (context.params as { then?: unknown }).then === "function" 
          ? await (context.params as Promise<Record<string, string | string[]>>) 
          : (context.params as Record<string, string | string[]>);
      }

      const authCtx: AuthenticatedContext = {
        userId,
        email,
        params: resolvedParams,
      };

      return await handler(req, authCtx);
    } catch (error) {
      logger.error("Auth proxy helper error", error);
      return NextResponse.json(
        { error: "Something went wrong during authorization check" },
        { status: 500 }
      );
    }
  };
}
