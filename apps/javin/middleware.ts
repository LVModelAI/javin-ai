import NextAuth from "next-auth";

import { authConfig } from "@/app/(auth)/auth.config";
import { NextRequest, NextResponse } from "next/server";

// export default NextAuth(authConfig).auth;

export default function middleware(req: any) {
  if (req.nextUrl.pathname === "/api/health-check") {
    return NextResponse.next();
  }
  return NextAuth(authConfig).auth(req);
}


export const config = {
  matcher: ["/", "/:id", "/api/:path*", "/login", "/register"],
};
