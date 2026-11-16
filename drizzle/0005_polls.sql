CREATE TABLE "poll_votes" (
	"message_id" text NOT NULL,
	"member_id" text NOT NULL,
	"choice" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "poll" jsonb;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "poll_votes_one" ON "poll_votes" USING btree ("message_id","member_id");