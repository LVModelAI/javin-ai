import {
  ConsumerEnumType,
  consumerTable,
  message,
  Message,
  nexusMessage,
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
  try {
    let targetTable: PgTableWithColumns<any>;
    switch (consumerName) {
      case "SENTIENT":
        targetTable = message;
        break;
      case "NEXUS":
        targetTable = nexusMessage;
        break;
      default:
        targetTable = message;
        break;
    }
    return await db.insert(targetTable).values(messages);
  } catch (error) {
    console.error("Failed to save messages in database", error);
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
    console.error("Failed to save tool tracking data in database", error);
    Sentry.captureException(error);
    throw error;
  }
}
