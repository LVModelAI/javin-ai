ALTER TABLE "Message" ADD COLUMN "transactionId" varchar;--> statement-breakpoint
ALTER TABLE "NexusMessage" ADD COLUMN "transactionId" varchar;--> statement-breakpoint
ALTER TABLE "SolanaMessage" ADD COLUMN "transactionId" varchar;