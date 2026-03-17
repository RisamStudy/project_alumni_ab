import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRIVATE_PATHS = ["/home", "/home/direktori", "/home/lowongan", "/home/survei", "/home/profil"];
const AUTH_PATHS = ["/login", "/register", "/lupa-password", "/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public paths
  if (pathname === "/" || pathname.startsWith("/verify-email")) {
    return NextResponse.next();
  }

  // For private paths, redirect to login if not authenticated
  // Note: We can't check localStorage in middleware (server-side)
  // So we'll let the client-side handle auth checks
  // This middleware only handles basic routing

  // Redirect from root auth pages to home if they seem to have auth cookie
  const hasRefreshToken = request.cookies.has("refresh_token");
  
  if (hasRefreshToken && AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
