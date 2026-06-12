# Clawdia's Board

A multi-agent orchestration board for the software development lifecycle, driven by event-spawned ephemeral agents powered by [OpenCode](https://opencode.ai) and chat-bridged to [Telegram](https://telegram.org) via your Clawdia PM bot.

> Drag a task to **In Progress** and a specialist agent spawns. Talk to it from the board, or from Telegram. When it's done, it self-destructs.

## Architecture at a glance

```
Telegram  ⇄  Clawdia (PM, you)
              │
              │  tool calls
              ▼
        Supabase (single source of truth)
        - tasks, columns, agents
        - activity_log, agent_runs, agent_logs
        - clawdia_messages (board ⇄ Telegram)
              │
              │  Realtime
              ▼
        Next.js Board
        ├─ Kanban (drag & drop)
        ├─ Global chat (Clawdia)
        ├─ Per-task drawer (chat + live run logs)
        └─ Activity feed (live)
              │
              │  POST /api/tasks/:id/move
              ▼
        Dispatcher
              │
              │  matches required_skills → role
              ▼
        OpenCode API (/v1/chat/completions)
              │
              │  streamed tool calls
              ▼
        Agent runtime
        - reads files
        - edits code
        - posts messages
        - logs to agent_logs
        - updates task via tool
        - self-destructs on done
```

## Stack

- **Next.js 16** (App Router, server components, RSC streaming)
- **React 19** with `useOptimistic`, `useTransition`
- **Supabase** — Postgres + Realtime + RLS
- **OpenCode Go** — `chat/completions` API (Claude / GPT-5 / etc.)
- **Telegram Bot API** — optional bridge to Clawdia
- **Zod 4** — input validation
- **Tailwind CSS 4**

## Getting started

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# OpenCode (required for agents to actually run)
OPENCODE_API_KEY=oc_...

# Telegram bridge (optional)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_WEBHOOK_SECRET=random_secret
CLAWDIA_CHAT_ID=123456789

# Budget
DAILY_BUDGET_USD=1.00
```

### 3. Set up the database

Run [`src/db/schema.sql`](./src/db/schema.sql) in the Supabase SQL editor. The script is **idempotent** and seeds Clawdia as the PM plus six specialist agents and a default board.

### 4. Run

```bash
pnpm dev
```

Open <http://localhost:3000>.

## How the orchestration works

1. You create tasks with `required_skills` (e.g. `['react', 'typescript']`).
2. Drag a task to **In Progress** → `POST /api/tasks/:id/move`.
3. The dispatcher:
   - matches `required_skills` to an agent role
   - inserts an `agent_runs` row (status=`queued`)
   - fires `runAgent(...)` in the background
4. The agent runtime:
   - loads the task
   - calls OpenCode with the role's system prompt and tool set
   - streams events → inserts `agent_logs` rows (Realtime pushes to the board)
   - executes tool calls (`update_task`, `log_activity`, `post_message`, …)
   - checks per-run cost ceiling and daily budget
   - updates the run with `status=completed|failed|paused_budget`
5. The board shows the running agent inline (pulse + timer + cost), the chat updates live, and Clawdia (Telegram) is informed if configured.

## API surface

| Method | Path | Purpose |
|---|---|---|
| `GET / POST` | `/api/tasks` | List / create tasks |
| `GET / PATCH / DELETE` | `/api/tasks/:id` | Single task |
| `POST` | `/api/tasks/:id/move` | Move a task; spawns an agent if target is **In Progress** |
| `GET / POST` | `/api/columns` | List / create columns |
| `GET / PATCH / DELETE` | `/api/columns/:id` | Single column |
| `GET / POST` | `/api/agents` | List / create agents |
| `GET / PATCH / DELETE` | `/api/agents/:id` | Single agent |
| `GET` | `/api/activity?task_id=…` | Activity log |
| `GET / POST` | `/api/agent-runs` | List / create runs |
| `GET / PATCH` | `/api/agent-runs/:id` | Inspect / update a run |
| `GET / POST` | `/api/agent-logs?run_id=…` | Stream / list logs |
| `GET / POST` | `/api/clawdia/messages` | Global or per-task chat; POST forwards to Telegram |
| `POST` | `/api/telegram/webhook` | Telegram → board (verifies `X-Telegram-Bot-Api-Secret-Token`) |

All input is validated with Zod 4. The board itself reads Supabase directly from server components — no self-HTTP roundtrips.

## Roles (defined in `src/lib/agents/registry.ts`)

| Role | Default model | Skills |
|---|---|---|
| `pm` | Claude Sonnet 4.5 | planning, communication |
| `tech-lead` | Claude Sonnet 4.5 | architecture, review |
| `frontend-react` | Claude Sonnet 4.5 | react, next, ts, tailwind |
| `backend-node` | Claude Sonnet 4.5 | node, postgres, sql, supabase |
| `qa-playwright` | Claude Haiku 4.5 | e2e, browser |
| `docs-writer` | Claude Haiku 4.5 | markdown, api-docs |
| `research` | GPT-5 mini | web research, summarization |

Per-role: max iterations, per-run cost ceiling, and a curated tool set. Pricing is set in `src/lib/opencode/client.ts` — update it as OpenCode's pricing changes.

## Telegram bridge (optional)

If you set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `CLAWDIA_CHAT_ID`:

1. Register the webhook with Telegram pointing at `https://your-deployment.com/api/telegram/webhook` with the secret header.
2. Messages you send in the board chat (or per-task chat) are forwarded to Clawdia via Telegram.
3. Messages Clawdia sends back in Telegram land in the board via the webhook and appear live (Realtime).

If the env vars are missing, the board chat still works — the bridge is opt-in.

## Scripts

```bash
pnpm dev    # next dev
pnpm build  # next build
pnpm start  # next start
pnpm lint   # eslint
```

## Deploy on Vercel

Push the repo, import in Vercel, set the env vars, run the SQL once, and you're live. The Supabase Realtime publication is already configured in the schema.

## What's intentionally NOT here

- **Auth / multi-tenant** — single-tenant (you)
- **Conversation panel as primary UI** — Telegram is the PM UI; the board chat mirrors it
- **Tests** — visual smoke tests during development
- **Real file execution** — `read_file`/`edit_file`/`run_command` log warnings; wire them to your repo when you're ready
- **Web search** — `research` role's `browser` tool is a stub
