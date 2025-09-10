import {
  ConsumerEnumType,
  consumerTable,
  hashTable,
  message,
  Message,
  nexusMessage,
  solanaMessage,
  toolTracking,
  ToolTracking,
} from "./schema";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as Sentry from "@sentry/nextjs";
import { PgTableWithColumns } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Save messages in the target table.
// table can be for Sentient or Nexus
export async function saveMessages({
  consumerName,
  messages,
}: {
  consumerName: ConsumerEnumType;
  messages: Array<Message>;
}) {
  console.log("saving messages ...");
  try {
    let targetTable: PgTableWithColumns<any>;
    switch (consumerName) {
      case "SENTIENT":
        targetTable = message;
        break;
      case "NEXUS":
        targetTable = nexusMessage;
        break;
      case "SOLANA_HACKATHON":
        targetTable = solanaMessage;
        break;
      default:
        return;
    }
    return await db.insert(targetTable).values(messages);
  } catch (error) {
    console.error("Failed to save messages in database", error);
    Sentry.captureException(error);
    throw error;
  }
}

export async function saveTxnData({
  hash,
  transactionId,
}: {
  hash: string;
  transactionId: string;
}) {
  try {
    return await db.insert(hashTable).values({ hash, transactionId });
  } catch (error) {
    console.error("Failed to save transaction data in database", error);
    Sentry.captureException(error);
    throw error;
  }
}

export async function saveToolTracking({
  toolTrackingData,
}: {
  toolTrackingData: ToolTracking;
}) {
  try {
    return await db.insert(toolTracking).values(toolTrackingData);
  } catch (error) {
    console.error("Failed to save tool tracking data in database", error);
    Sentry.captureException(error);
    throw error;
  }
}

export async function getConsumerUsingApiKey({ apiKey }: { apiKey: string }) {
  try {
    const [consumer] = await db
      .select()
      .from(consumerTable)
      .where(eq(consumerTable.apiKey, apiKey));
    return consumer;
  } catch (error) {
    console.error("Failed to retrieve consumer data using API key", error);
    Sentry.captureException(error);
    throw error;
  }
}
