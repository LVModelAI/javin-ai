import {
  pgTable,
  uuid,
  varchar,
  json,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const hashTable = pgTable("HashTable", {
  hash: varchar("hash").primaryKey().notNull(),
  transactionId: varchar("transactionId").notNull(),
});

export type HashTable = InferSelectModel<typeof hashTable>;
