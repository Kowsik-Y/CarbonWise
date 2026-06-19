import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./services/auth";

// Exclude static assets and static files to optimize proxy runs
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, icon.png, manifest.webmanifest (metadata and public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|icon.png|manifest.webmanifest|pwa_icon|carbonwise_favicon).*)",
  ],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // Verify the authentication token if present
  let payload = null;
  if (token) {
    payload = await verifyToken(token);
  }

  // Define route classifications
  const protectedPages = [
    "/dashboard",
    "/assessment",
    "/challenges",
    "/coach",
    "/goals",
    "/profile",
    "/simulator",
  ];

  const isProtectedPage = protectedPages.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  const isProtectedApi =
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/login") &&
    !pathname.startsWith("/api/auth/signup") &&
    !pathname.startsWith("/api/auth/logout") &&
    !pathname.startsWith("/api/auth/session");

  const isAuthPage = pathname === "/auth";
  const isLandingPage = pathname === "/";

  // 1. Authenticated User Flow
  if (payload) {
    // Prevent logged-in users from seeing Auth page or root landing page (redirect to dashboard)
    if (isAuthPage || isLandingPage) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Inject identity headers into protected API routes to simplify backend routes
    if (isProtectedApi) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", payload.userId);
      requestHeaders.set("x-user-email", payload.email || "");

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  }

  // 2. Unauthenticated User Flow
  if (isProtectedPage) {
    return NextResponse.redirect(new URL("/auth?mode=login", request.url));
  }

  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}
