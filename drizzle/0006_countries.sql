ALTER TABLE "articles" ADD COLUMN "countries" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "countries" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX "stories_countries_idx" ON "stories" USING gin ("countries");