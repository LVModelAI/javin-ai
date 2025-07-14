import { NextRequest, NextResponse } from "next/server";
import {
  markdownToCanonicalText,
  sha256,
  verifyHashIntegrity,
} from "@javin/shared/lib/utils/crypto";
import { APIClient, FetchProvider } from "@wireio/core";
import { findHashAndReturnTxnId } from "@/lib/javin-api-db/javin-api-db";

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

    // create hash from the output
    const canonicalFromMarkdown = await markdownToCanonicalText(output);
    const hashFromMarkdown = sha256(canonicalFromMarkdown);
    console.log("Verifying hash from markdown:", hashFromMarkdown);

    //check if hash exists in db and get txn id
    const txnId = await findHashAndReturnTxnId({
      hash: hashFromMarkdown,
    });
    if (!txnId) {
      console.error("Hash not found in database");
      return NextResponse.json({
        success: false,
        error: "Hash not found in database.",
      });
    }
    // find the txn on chain and verify the hash
    const isVerified: boolean = await verifyHashIntegrity(
      hashFromMarkdown,
      txnId
    );

    return NextResponse.json({ success: isVerified });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
