import { count, eq } from "drizzle-orm";
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

// New function to get the total number of hashes in the table
export async function getTotalHashes(): Promise<number> {
  const result = await db.select({ count: count() }).from(hashTable);
  console.log("result --- ", result);
  // result ---  [ { count: 18 } ]
  // Return the count of rows

  return result[0].count;
  // return 10;
}
