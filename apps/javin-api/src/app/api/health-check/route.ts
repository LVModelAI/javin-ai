
import { NextRequest } from "next/server";
import { GET as healthCheckGET } from "@javin/shared/health-check/main";

export async function GET(request: NextRequest) {
  return healthCheckGET();
}
