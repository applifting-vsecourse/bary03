# Quacker — starter template

Full-stack teaching template: pnpm monorepo with two apps.

- `apps/backend` — NestJS + Prisma + Postgres. Auth: BetterAuth (mounted at `/api/auth/*`, treat as a black box). API docs: Swagger at `/api/docs`.
- `apps/frontend` — React + Vite + TanStack Router/Query, Tailwind + shadcn/ui, `ky` + `zod` API client. Feature folders under `src/features/`.

The worked example is the quack feed: `Quack` model → seed → repository → service → `GET`/`POST /api/quacks` (DTO-validated, author taken from the session) → zod schema → TanStack Query → list page + post form. Copy its pattern for new features.

**Before writing or changing any UI, read [`DESIGN.md`](DESIGN.md).** It is a contract, not a suggestion — it exists to stop generated screens drifting into generic nested cards.

## Commands

- `pnpm dev` — everything: env files, Postgres (Docker), migrate, seed, both dev servers
- `pnpm check-all` — lint + type-check + tests + build (same as CI)
- `pnpm backend test` / `pnpm frontend test:ci` — unit tests
- `pnpm backend prisma:migrations:run` — create/apply migrations after schema changes

## Conventions

Deliberately sparse — this file grows as the team learns what it expects from generated code. Add rules here when you find yourself repeating the same review feedback.

### UI controls come from the kit

Need a control that isn't in `src/components/ui/`? Add it with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one in a feature folder, even where a native input would do the job. One accessibility implementation to reason about beats a per-control judgement call.

The CLI puts `shadow-xs`/`shadow-sm` on inputs, textareas and cards. [`DESIGN.md`](DESIGN.md) keeps shadows for things that genuinely float — dialogs, dropdowns, toasts. Strip them.

### No tests in `src/routes/`

Never put test files inside `apps/frontend/src/routes/`. TanStack Router's file-based routing turns every file there into a route, a test included. Keep route files thin: put the components in `src/features/<feature>/components/` and their tests next to them. If a page has logic worth testing, move it into a feature component and render that from the route.

### Validation errors say exactly what is wrong

One message per way a value can fail, never one generic message for the whole rule: "Username is too short — use at least 3 characters.", "Username is too long — use at most 30 characters (you have 34).", ""#" isn't allowed. Use only letters, numbers, dots and underscores." Name the offending character, give the real count, say how to fix it.

The backend returns the same wording as the form, so the API is just as specific. The settings rules (`settings-rules.ts` in the backend, `settingsRules.ts` in the frontend) are the pattern to copy.

An error must not repeat the field's hint. While a field shows an error, the error replaces the hint.

### Optimistic mutations use `networkMode: "always"`

A mutation that updates the screen before the server answers must set `networkMode: "always"`. By default TanStack Query pauses mutations while the browser is offline: no request is sent and no error is raised. The change looks saved when it isn't, and the user never finds out. With `"always"`, the request fails at once, the rollback runs and the user sees the error. `useVote` (`features/quack/hooks/useVote.ts`) is the pattern to copy.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative.
