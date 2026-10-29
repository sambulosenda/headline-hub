CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"outlet_id" text NOT NULL,
	"story_id" integer,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"image_url" text,
	"topics" text[] NOT NULL,
	"tokens" text[] NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "feeds" (
	"url" text PRIMARY KEY NOT NULL,
	"outlet_id" text NOT NULL,
	"topics" text[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"etag" text,
	"last_modified" text,
	"last_fetched_at" timestamp with time zone,
	"last_status" integer,
	"last_error" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outlets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"homepage" text NOT NULL,
	"region" text NOT NULL,
	"kind" text NOT NULL,
	"quality" real NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"lead_article_id" integer,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"outlet_count" integer DEFAULT 1 NOT NULL,
	"recent_outlets" integer DEFAULT 1 NOT NULL,
	"avg_quality" real DEFAULT 1 NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feeds" ADD CONSTRAINT "feeds_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_story_idx" ON "articles" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "articles_published_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "stories_score_idx" ON "stories" USING btree ("score");--> statement-breakpoint
CREATE INDEX "stories_last_seen_idx" ON "stories" USING btree ("last_seen_at");