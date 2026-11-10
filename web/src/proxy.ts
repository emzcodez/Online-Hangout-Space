import { NextResponse, type NextRequest } from "next/server";

// An early redirect for missing cookies. The dashboard layout remains the
// authoritative check because a cookie can be expired, invalid, or suspended.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("ohs_session")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
