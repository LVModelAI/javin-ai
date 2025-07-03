import { NextRequest, NextResponse } from "next/server";
import { verifyHashIntegrity } from "@javin/shared/lib/utils/crypto";

export async function POST(req: NextRequest) {
  try {
    const { output } = await req.json();

    if (!output || typeof output !== "string") {
      return NextResponse.json(
        { success: false, error: "No output provided." },
        { status: 400 }
      );
    }

    const hashResult = await verifyHashIntegrity(output)

    return NextResponse.json({ success: hashResult });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
