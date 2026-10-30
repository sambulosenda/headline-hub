CREATE TABLE "trending_names" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"outlets" integer NOT NULL,
	"articles" integer NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "trending_names_seen_idx" ON "trending_names" USING btree ("last_seen_at");