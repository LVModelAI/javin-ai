import { message, Message, toolTracking, ToolTracking } from "./schema";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as Sentry from "@sentry/nextjs";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
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