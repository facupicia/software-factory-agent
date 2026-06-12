# Agent Kanban

AI Agent Team Kanban Dashboard — Next.js 16 + Supabase.

## Stack

- **Next.js 16** (App Router, server components)
- **React 19** with `useOptimistic` + `useTransition` for snappy drag-and-drop
- **Tailwind CSS 4**
- **Supabase** (Postgres + Realtime)
- **Zod 4** for input validation
- **TypeScript 5** (strict mode)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Service role key (bypasses RLS) |
| `NEXT_PUBLIC_SITE_URL` | optional | Public site URL for self-calls (only needed for non-Vercel deployments) |

### 3. Set up the database

Open the Supabase SQL editor and run [`src/db/schema.sql`](./src/db/schema.sql).
The script is **idempotent** — safe to re-run.

### 4. Run the dev server

```bash
pnpm dev
```

Open <http://localhost:3000>.

## API

All routes are in `src/app/api/*` and use Zod-validated input.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/columns` | List columns (ordered by `position`) |
| `POST` | `/api/columns` | Create a column |
| `PATCH` | `/api/columns/:id` | Update a column (title/color/position) |
| `DELETE` | `/api/columns/:id` | Delete a column |
| `GET` | `/api/tasks` | List tasks |
| `POST` | `/api/tasks` | Create a task (logs to activity) |
| `GET` | `/api/tasks/:id` | Get a single task |
| `PATCH` | `/api/tasks/:id` | Update task fields (logs `updated`) |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `POST` | `/api/tasks/:id/move` | Move task to another column (logs `moved`) |
| `GET` | `/api/agents` | List agents |
| `POST` | `/api/agents` | Register an agent |
| `PATCH` | `/api/agents/:id` | Update agent (incl. status) |
| `DELETE` | `/api/agents/:id` | Delete an agent |
| `GET` | `/api/activity?task_id=…` | List activity (optionally filtered) |
| `POST` | `/api/activity` | Append a custom activity entry |

## Scripts

```bash
pnpm dev    # next dev
pnpm build  # next build
pnpm start  # next start
pnpm lint   # eslint
```

## Deploy on Vercel

The easiest path — push the repo and import in Vercel. Set the four env
variables in the project settings, then run `src/db/schema.sql` once in the
Supabase SQL editor.
