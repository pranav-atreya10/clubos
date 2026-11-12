# ClubOS

The operational home for school clubs: get AM Wired announcements approved and sent, keep everyone on one calendar, and spot future board members.

Built with Next.js, Tailwind, Postgres (Drizzle), GSAP, Lenis, and React Bits.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With nothing configured, ClubOS uses a built-in Postgres database (saved in `.data/`, created automatically).

## Pages

| Page | What it is |
| --- | --- |
| `/` | Landing page |
| `/sign-up`, `/sign-in` | Email + password accounts (built in, no extra service) |
| `/app` | The app |
| `/demo` | Try a sample club as an Officer, Advisor, or Member, no account needed. Shared by everyone and resets daily. |
| `/demovid` | The 43-second product video (`public/demo/`) |
| `/api/health` | Says whether the database is connected (never shows connection details) |

## Going live

ClubOS stores everything in **Postgres** (via [Drizzle](https://orm.drizzle.team)). Any Postgres works; [Supabase](https://supabase.com) has a free plan.

1. Create a Supabase project → **Connect** → copy the **Transaction pooler** connection string (port 6543) and put your password in it.
2. Set it as `DATABASE_URL` in your host's environment variables (on Vercel: Settings → Environment Variables, marked **Sensitive**), then redeploy.
3. Tables are created automatically on first run. Visit `/api/health` to check it's connected.
4. Create an account → **Start a club** → share the invite code from **Settings → Invite people**.
5. In **Members**, set each person's account type (Officer, Advisor, Member).

Changing the schema: edit `src/db/schema.ts`, then `npm run db:generate` to create a new migration in `drizzle/`.

### How sign-in works

Passwords are hashed with scrypt (never stored). Signing in creates a random session token in an httpOnly cookie; only its SHA-256 hash is stored, so a database leak can't be used to log in. Five wrong passwords lock that account for five minutes. There's no password reset by email yet.

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
