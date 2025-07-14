import { eq } from "drizzle-orm";
import { hashTable } from "./schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const DATABASE_URL = process.env.POSTGRES_JAVIN_API_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set.");
}
// Initialize postgres client
const client = postgres(DATABASE_URL);

// Pass client to drizzle
const db = drizzle(client);

export async function findHashAndReturnTxnId({
  hash,
}: {
  hash: string;
}): Promise<string | null> {
  const result = await db
    .select()
    .from(hashTable)
    .where(eq(hashTable.hash, hash));
  if (result.length === 0) {
    return null;
  }
  return result[0].transactionId;
}
