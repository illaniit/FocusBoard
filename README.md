# FocusBoard

FocusBoard is a modern personal productivity dashboard for organizing tasks, subjects, projects, habits, deadlines, and weekly progress in a visual workspace.

It is built as a premium SaaS-style web app with Next.js, Tailwind CSS, shadcn/ui, Framer Motion, and Supabase.

## Highlights

- Private user accounts with Supabase Auth.
- Guest mode with browser-only local storage.
- Dashboard with daily summary, weekly progress, deadlines, habits, and productivity stats.
- Smart "What should I do now?" recommendation based on urgency, priority, deadline, difficulty, and estimated effort.
- Today view grouped by priority.
- Kanban board with pending, in progress, blocked, and done columns.
- Subjects with exams, milestones, priority, tasks, and progress.
- Personal projects with status, optional external links, related tasks, and progress.
- Configurable habits by weekdays or custom intervals.
- Interactive calendar with quick task creation.
- Visual completion celebration when finishing tasks.
- Dark mode and responsive desktop, tablet, and mobile layouts.
- Import/export support for local board backups.
- Supabase Row Level Security schema included.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Lucide Icons
- Supabase Auth and Postgres
- Vercel-ready deployment

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Add your Supabase public browser-safe values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Run the development server:

```bash
npm run dev -- -p 3005
```

Open:

```text
http://localhost:3005
```

## Supabase Setup

1. Create a Supabase project.
2. Copy your Project URL and publishable key.
3. Run [supabase/schema.sql](./supabase/schema.sql) in the Supabase SQL Editor.
4. Disable email confirmation in Supabase Auth if you want accounts to enter immediately after sign-up.
5. Configure Auth redirect URLs for localhost and your production Vercel domain.
6. Add the required environment variables to Vercel and deploy.

## Security Notes

FocusBoard is safe to publish as an open-source repository when configured correctly:

- `.env.local` is ignored by Git.
- The app only uses `NEXT_PUBLIC_*` browser-safe Supabase values.
- Never commit `service_role`, `sb_secret`, private tokens, or database passwords.
- User data is protected by Supabase Row Level Security.
- The included SQL schema grants table access only to authenticated users and enforces per-user ownership.
- Guest mode stores data only in the current browser via `localStorage`.

## Deployment

Recommended platform: Vercel.

Build command:

```bash
npm run build
```

Environment variables required in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

After deploying, add the final Vercel URL to Supabase Auth redirect settings.

## Validation

Run these checks before deployment:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Current Data Model

The current version stores each user's board as a private JSON snapshot in Supabase. This keeps the product simple and secure for a first release.

If the app grows, the next recommended step is to normalize the data into separate tables:

- `tasks`
- `subjects`
- `projects`
- `habits`
- `calendar_events`

That would enable stronger querying, partial sync, audit trails, and better performance with large boards.

## License

This project is currently private-use unless a license is added.
