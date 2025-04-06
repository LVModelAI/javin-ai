import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

// A faulty API route to test Sentry's error monitoring
export function GET() {
  Sentry.captureException(new Error("Sentry capture errors"));
  return NextResponse.json({ data: "Testing Sentry Error..." });
}
