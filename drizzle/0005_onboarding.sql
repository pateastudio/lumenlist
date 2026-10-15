CREATE TABLE "onboarding" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"walk_ended_at" timestamp with time zone,
	"walk_outcome" text,
	"peeked_at" timestamp with time zone,
	"secret_seen_at" timestamp with time zone,
	"hints_read" text[] DEFAULT '{}'::text[] NOT NULL,
	"steps_ended_at" timestamp with time zone,
	"steps_outcome" text,
	"steps_track" text,
	"restarted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_walk_outcome_check" CHECK ("onboarding"."walk_outcome" in ('completed', 'skipped')),
	CONSTRAINT "onboarding_steps_outcome_check" CHECK ("onboarding"."steps_outcome" in ('completed', 'hidden')),
	CONSTRAINT "onboarding_steps_track_check" CHECK ("onboarding"."steps_track" in ('invited', 'solo'))
);
--> statement-breakpoint
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Own-row access only. profiles_select lets every signed-in person read every profile, which is
-- why this is its own table: a person's tour progress is nobody else's business.
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON onboarding TO app_user;
--> statement-breakpoint
CREATE POLICY onboarding_select_own ON onboarding FOR SELECT TO app_user USING (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY onboarding_insert_own ON onboarding FOR INSERT TO app_user WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY onboarding_update_own ON onboarding FOR UPDATE TO app_user USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
