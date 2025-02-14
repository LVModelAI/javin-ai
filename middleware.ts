import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // This middleware does nothing and allows all requests to proceed
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
