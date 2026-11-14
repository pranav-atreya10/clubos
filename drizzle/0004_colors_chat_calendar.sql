CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"club_id" text NOT NULL,
	"member_id" text,
	"author" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "calendar_token" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_club" ON "messages" USING btree ("club_id","created_at");