import { NextRequest, NextResponse } from "next/server";
import { getTotalHashes } from "@/lib/javin-api-db/javin-api-db";

export async function GET(req: NextRequest) {
  try {
    const result = await getTotalHashes();
    console.log("Total hashes count:", result);

    // Ensure you're sending a structured response
    return NextResponse.json({ success: true, count: result });
  } catch (error) {
    console.error("Error fetching total hashes count:", error);

    // Return a structured error response with more specific information
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Could not fetch hash count.",
      },
      { status: 500 }
    );
  }
}
