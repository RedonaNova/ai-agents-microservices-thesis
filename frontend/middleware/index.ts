import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight auth guard using our JWT cookie `auth-token`.
 * We only protect app pages that require auth; landing and auth pages remain public.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;

  // Public paths (no redirect)
  const publicPaths = [
    "/",
    "/sign-in",
    "/sign-up",
    "/api", // allow API routes
    "/favicon.ico",
  ];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // Protected prefixes
  const protectedPrefixes = ["/watchlist", "/ai-agents", "/stocks", "/home"];
  const isProtected = protectedPrefixes.some((p) =>
    pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !token) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|assets).*)"],
};
