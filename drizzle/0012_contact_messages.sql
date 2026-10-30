CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"organisation" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_email_idx" ON "contact_messages" USING btree ("email","created_at");