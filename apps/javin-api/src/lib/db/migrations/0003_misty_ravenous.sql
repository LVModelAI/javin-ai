CREATE TABLE IF NOT EXISTS "HashTable" (
	"hash" varchar PRIMARY KEY NOT NULL,
	"transactionId" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Message" DROP COLUMN IF EXISTS "hash";--> statement-breakpoint
ALTER TABLE "Message" DROP COLUMN IF EXISTS "transactionId";--> statement-breakpoint
ALTER TABLE "NexusMessage" DROP COLUMN IF EXISTS "hash";--> statement-breakpoint
ALTER TABLE "NexusMessage" DROP COLUMN IF EXISTS "transactionId";--> statement-breakpoint
ALTER TABLE "SolanaMessage" DROP COLUMN IF EXISTS "hash";--> statement-breakpoint
ALTER TABLE "SolanaMessage" DROP COLUMN IF EXISTS "transactionId";