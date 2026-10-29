CREATE TABLE "saved_stories" (
	"user_id" integer NOT NULL,
	"story_id" integer NOT NULL,
	"article_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_stories_user_id_story_id_pk" PRIMARY KEY("user_id","story_id")
);
--> statement-breakpoint
ALTER TABLE "saved_stories" ADD CONSTRAINT "saved_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_stories" ADD CONSTRAINT "saved_stories_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_stories" ADD CONSTRAINT "saved_stories_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_stories_user_idx" ON "saved_stories" USING btree ("user_id","created_at");