import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"




export const message = pgTable("Message", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	prompt: varchar().notNull(),
	response: varchar().notNull(),
	location: varchar().notNull(),
	model: varchar().notNull(),
	stream: boolean().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
});