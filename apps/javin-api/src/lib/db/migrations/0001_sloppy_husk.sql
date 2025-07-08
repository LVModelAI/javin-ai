CREATE TABLE IF NOT EXISTS "ConsumerTable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apiConsumerName" varchar NOT NULL,
	"apiKey" varchar NOT NULL,
	"mode" varchar NOT NULL,
	"tableName" varchar NOT NULL,
	"description" varchar NOT NULL,
	"createdAt" timestamp NOT NULL,
	"rate_limit" integer DEFAULT 10 NOT NULL,
	CONSTRAINT "ConsumerTable_apiKey_unique" UNIQUE("apiKey")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "NexusMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt" varchar NOT NULL,
	"response" varchar NOT NULL,
	"location" varchar NOT NULL,
	"model" varchar NOT NULL,
	"stream" boolean NOT NULL,
	"createdAt" timestamp NOT NULL,
	"nonce" varchar,
	"hash" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SolanaMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt" varchar NOT NULL,
	"response" varchar NOT NULL,
	"location" varchar NOT NULL,
	"model" varchar NOT NULL,
	"stream" boolean NOT NULL,
	"createdAt" timestamp NOT NULL,
	"nonce" varchar,
	"hash" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ToolTracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userPrompt" varchar NOT NULL,
	"aiResponse" json NOT NULL,
	"toolsCalled" json[] NOT NULL,
	"toolsCalledNames" json[] NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "nonce" varchar;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "hash" varchar;