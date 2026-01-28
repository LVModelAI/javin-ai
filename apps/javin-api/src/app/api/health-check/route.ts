
import { NextRequest, NextResponse } from "next/server";
import { GET as healthCheckGET } from "@javin/shared/health-check/main";

export async function GET(request: NextRequest) {
  // Check for authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }
 
  return healthCheckGET();
}
