import { NextRequest, NextResponse } from "next/server";
import { verifyHashIntegrity } from "@javin/shared/lib/utils/crypto";
import { APIClient, FetchProvider } from "@wireio/core";

export async function POST(req: NextRequest) {
  try {
    const { output } = await req.json();

    if (!output || typeof output !== "string") {
      return NextResponse.json(
        { success: false, error: "No output provided." },
        { status: 400 }
      );
    }

    const privateKey = process.env.PRIVATE_KEY!;
    const endpoint = process.env.API_ENDPOINT!;
    const contractAccount = process.env.CONTRACT_ACCOUNT!;
    const actor = process.env.ACTOR!;

    if (!privateKey || !endpoint || !contractAccount || !actor) {
      throw new Error(
        "Missing required environment variables: PRIVATE_KEY, API_ENDPOINT, CONTRACT_ACCOUNT, ACTOR"
      );
    }

    const apiClient = new APIClient({
      provider: new FetchProvider(endpoint),
    });

    const hashResult = await verifyHashIntegrity(
      apiClient,
      output,
      contractAccount,
      actor,
      privateKey
    );

    return NextResponse.json({ success: hashResult });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
