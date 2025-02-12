ALTER TABLE "User" ADD COLUMN "walletAddress" varchar(64);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "tier" varchar(64) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "messageCount" integer DEFAULT 0 NOT NULL;