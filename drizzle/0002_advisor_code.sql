ALTER TABLE "clubs" ALTER COLUMN "attendance_url" SET DEFAULT 'https://livingston.schoology.com';--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "advisor_invite_code" text;--> statement-breakpoint
CREATE UNIQUE INDEX "clubs_advisor_invite_code" ON "clubs" USING btree ("advisor_invite_code");--> statement-breakpoint
-- Clubs made before this had no attendance link: use the (placeholder) school Schoology site.
UPDATE "clubs" SET "attendance_url" = 'https://livingston.schoology.com' WHERE "attendance_url" = '';
