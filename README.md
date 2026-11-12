# ClubOS

The operational home for school clubs: get AM Wired announcements approved and sent, keep everyone on one calendar, and spot future board members.

Built with Next.js, Tailwind, Clerk, GSAP, Lenis, and React Bits.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no Clerk keys it runs as a **demo**: sample data saved in your browser, and a "View as" switch at the top to try the Officer, Advisor, and Member accounts.

## Accounts

| Account | Who | Can do |
| --- | --- | --- |
| Officer (`admin`) | Club leaders (all equal) | Everything: AM Wired, members, ratings, tasks, settings, features |
| Advisor (`advisor`) | e.g. Mr. Anderson | Approve / edit / send back AM Wired, post announcements, rate members and star board candidates, view tasks (read only) |
| Member (`member`) | Everyone else | Home, announcements, calendar, resources, and **only their own** tasks |

Tasks and member ratings keep a **version history** (who changed what, and when). Quick back-to-back rating clicks by the same person are merged into one entry.

## Turning on real sign-in (Clerk)

1. Copy `.env.example` to `.env.local` and paste your keys from the Clerk dashboard.
2. In Clerk, open a user → **Public metadata** and set `{ "role": "admin" }` or `{ "role": "advisor" }`. Anyone without a role is a member.

## How AM Wired works

1. **Draft** — auto-fill a week's message from the calendar, edit it, or skip weeks with nothing to announce.
2. **Approve** — the advisor approves, edits, or sends it back with a note, inside their own account.
3. **Send** — "Open in email app" makes a ready-to-send email to the AM Wired address from your own account. No school Gmail permissions needed.

## Notes

- Attendance stays on the school's website; ClubOS links to it (set the URL in Settings).
- Member ratings (x/10) and notes are only visible to officers and the advisor.
- Demo data lives in the browser (`localStorage`). A real database is the next step.
- `src/components/reactbits/` are vendored from [React Bits](https://reactbits.dev) (MIT + Commons Clause).
