# ClubOS

The operational home for school clubs: get AM Wired announcements approved and sent, keep everyone on one calendar, and spot future board members.

Built with Next.js, Tailwind, Clerk, GSAP, Lenis, and React Bits.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With nothing configured, ClubOS runs in **demo mode**: a built-in Postgres database (saved in `.data/`, created automatically) with a sample club, and a "View as" switch at the top to try the Officer, Advisor, and Member accounts.

## Going live: database + logins

ClubOS stores everything in **Postgres** (via [Drizzle](https://orm.drizzle.team)). Any Postgres works; [Supabase](https://supabase.com) has a free plan.

1. **Database:** create a Supabase project → **Connect** → copy the **Transaction pooler** connection string (port 6543) and put your database password in it. Set it as `DATABASE_URL` in `.env.local` (and in your host's environment variables).
2. **Logins:** create a [Clerk](https://dashboard.clerk.com) app and set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. Start the app. Tables are created automatically on first run (or run `npm run db:migrate`).
4. Sign in → **Start a club** → share the invite code from **Settings → Invite people**.
5. In **Members**, set each person's account type (Officer, Advisor, Member).

Changing the schema: edit `src/db/schema.ts`, then `npm run db:generate` to create a new migration in `drizzle/`.

## Accounts

Roles are **per club**, stored in the database, and set by officers in Members. One person can be in several clubs (switch from the club name in the sidebar).

| Account | Who | Can do |
| --- | --- | --- |
| Officer (`admin`) | Club leaders (all equal) | Everything: AM Wired, members, ratings, tasks, settings, features |
| Advisor (`advisor`) | e.g. Mr. Anderson | Approve / edit / send back AM Wired, post announcements, rate members and star board candidates, view tasks (read only) |
| Member (`member`) | Everyone else | Home, announcements, calendar, resources, and **only their own** tasks |

Tasks and member ratings keep a **version history** (who changed what, and when). Quick back-to-back rating clicks by the same person are merged into one entry.

## How AM Wired works

1. **Draft** — auto-fill a week's message from the calendar, edit it, or skip weeks with nothing to announce.
2. **Approve** — the advisor approves, edits, or sends it back with a note, inside their own account.
3. **Send** — "Open in email app" makes a ready-to-send email to the AM Wired address from your own account. No school Gmail permissions needed.

## Notes

- Attendance stays on the school's website; ClubOS links to it (set the URL in Settings).
- Member ratings (x/10) and notes are only visible to officers and the advisor.
- Every save is checked on the server: who you are, which club, and what your account type allows. Members never receive ratings, other people's tasks, AM Wired drafts, or Officers-only resources.
- `src/components/reactbits/` are vendored from [React Bits](https://reactbits.dev) (MIT + Commons Clause).
