CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"club_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"by" text NOT NULL,
	"action" text NOT NULL,
	"kind" text,
	"prev" integer
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"club_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"date" date NOT NULL,
	"author" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"invite_code" text NOT NULL,
	"advisor_name" text DEFAULT 'Your advisor' NOT NULL,
	"wired_email" text DEFAULT 'amwired@livingston.org' NOT NULL,
	"attendance_url" text DEFAULT '' NOT NULL,
	"meeting_day" text DEFAULT 'Wednesday' NOT NULL,
	"meeting_time" text DEFAULT '3:15 PM' NOT NULL,
	"meeting_room" text DEFAULT '' NOT NULL,
	"wired_template" text NOT NULL,
	"features" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"club_id" text NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"time" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"club_id" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"grade" integer DEFAULT 9 NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"title" text DEFAULT 'Member' NOT NULL,
	"joined" date NOT NULL,
	"rating" integer,
	"rating_note" text DEFAULT '' NOT NULL,
	"board_candidate" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"club_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"category" text DEFAULT 'Club info' NOT NULL,
	"added_by" text NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"club_id" text NOT NULL,
	"title" text NOT NULL,
	"assignee_id" text,
	"due" date NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wired_weeks" (
	"id" text PRIMARY KEY NOT NULL,
	"club_id" text NOT NULL,
	"week_of" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"advisor_note" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_members_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wired_weeks" ADD CONSTRAINT "wired_weeks_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_entity" ON "activity" USING btree ("club_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "announcements_club" ON "announcements" USING btree ("club_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clubs_invite_code" ON "clubs" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "events_club" ON "events" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "members_club" ON "members" USING btree ("club_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_club_user" ON "members" USING btree ("club_id","user_id");--> statement-breakpoint
CREATE INDEX "resources_club" ON "resources" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "tasks_club" ON "tasks" USING btree ("club_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wired_club_week" ON "wired_weeks" USING btree ("club_id","week_of");