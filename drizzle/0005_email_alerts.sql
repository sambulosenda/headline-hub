CREATE TABLE "alerts_sent" (
	"user_id" integer NOT NULL,
	"story_id" integer NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_sent_user_id_story_id_pk" PRIMARY KEY("user_id","story_id")
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"digest" boolean DEFAULT false NOT NULL,
	"alerts" boolean DEFAULT false NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"last_digest_at" timestamp with time zone,
	CONSTRAINT "email_settings_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
ALTER TABLE "alerts_sent" ADD CONSTRAINT "alerts_sent_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts_sent" ADD CONSTRAINT "alerts_sent_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_settings" ADD CONSTRAINT "email_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_sent_user_idx" ON "alerts_sent" USING btree ("user_id","sent_at");