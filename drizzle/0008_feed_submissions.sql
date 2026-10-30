CREATE TABLE "feed_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"outlet_name" text NOT NULL,
	"homepage" text NOT NULL,
	"feed_url" text NOT NULL,
	"contact_email" text NOT NULL,
	"region" text NOT NULL,
	"topics" text[] NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"vetting" jsonb NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "feed_submissions_feed_url_unique" UNIQUE("feed_url")
);
--> statement-breakpoint
CREATE INDEX "feed_submissions_status_idx" ON "feed_submissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "feed_submissions_contact_idx" ON "feed_submissions" USING btree ("contact_email","created_at");