import { NextRequest, NextResponse } from "next/server";
import { GET as healthCheckGET } from "@javin/shared/health-check/main";

export async function GET(request: NextRequest) {
  // Check for authorization header
  //   const authHeader = request.headers.get("authorization");
  //   const apiKey = "hardcoding this for now, no secrecey needed here tbh for health check";

  //   if (!apiKey) {
  //     return NextResponse.json(
  //       { error: "Health check API key not configured" },
  //       { status: 500 }
  //     );
  //   }

  //   if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
  //     return NextResponse.json(
  //       { error: "Unauthorized" },
  //       { status: 401 }
  //     );
  //   }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  return healthCheckGET();
}
