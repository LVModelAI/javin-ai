-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE IF NOT EXISTS "Message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt" varchar NOT NULL,
	"response" varchar NOT NULL,
	"location" varchar NOT NULL,
	"model" varchar NOT NULL,
	"stream" boolean NOT NULL,
	"createdAt" timestamp NOT NULL
);

*/