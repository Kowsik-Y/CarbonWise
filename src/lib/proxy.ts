import { NextRequest, NextResponse } from "next/server";

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
 * Exposes the authenticated context injected by the global proxy middleware.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context?: { params?: Promise<any> | any }) => {
    try {
      const userId = req.headers.get("x-user-id");
      const email = req.headers.get("x-user-email") || "";

      if (!userId) {
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
        userId,
        email,
        params: resolvedParams,
      };

      return await handler(req, authCtx);
    } catch (error) {
      console.error("Auth proxy helper error:", error);
      return NextResponse.json(
        { error: "Something went wrong during authorization check" },
        { status: 500 }
      );
    }
  };
}
