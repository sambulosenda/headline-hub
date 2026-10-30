CREATE TABLE "analytics_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"target" text NOT NULL,
	"referrer" text,
	"visitor" text NOT NULL,
	"device" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_salts" (
	"day" date PRIMARY KEY NOT NULL,
	"salt" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "analytics_events_kind_idx" ON "analytics_events" USING btree ("kind","created_at");