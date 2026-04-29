import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const isLoggedIn = req.cookies.get("superadmin")?.value === "1";
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|assets|static).*)"]
};
