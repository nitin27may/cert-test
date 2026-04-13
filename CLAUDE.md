# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

```bash
npm run dev              # Next.js dev server on http://localhost:3000 (Turbopack)
npm run build            # Production build
npm run start            # Run the production build
npm run lint             # ESLint (next lint)

# Supabase (CLI must be installed and project linked — see Database below)
npm run db:push          # Apply supabase/migrations/ to the linked remote project
npm run db:reset         # Local Supabase stack only: drop + re-apply migrations + replay seed.sql
npm run seed:generate    # Re-fetch public content tables and overwrite supabase/seed.sql

# Backup cluster (requires SUPABASE_SERVICE_ROLE_KEY)
npm run backup:db        # Dumps every table (incl. user data) to backups/<timestamp>/ as JSON + SQL
npm run restore:db       # Restores from a backup produced by backup:db
npm run verify:backup    # Compares a backup snapshot against the live database
```

There is **no test suite** in this repo. Do not add `npm test` instructions or invent test commands.

## Environment

`.env.local` must define:

- `NEXT_PUBLIC_SUPABASE_URL` — exposed to the browser
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — exposed to the browser; RLS protects everything
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used **exclusively** by the scripts in `scripts/`. Never import it from `src/`
- `SUPABASE_ACCESS_TOKEN` (optional) — Supabase CLI personal access token, lets `supabase link` / `db push` run non-interactively

The single browser-side Supabase client lives at [src/lib/supabase.ts](src/lib/supabase.ts). All app code imports `{ supabase }` from there — do not instantiate new clients in components.

## Architecture

### Next.js App Router + Supabase-as-backend

This is a Next.js 15 App Router project (React 19, TypeScript strict, Tailwind v4). The "backend" is Supabase Postgres + Auth + Realtime — there is **no Node/Express server**. The `src/app/api/*` routes exist but are thin; most data access happens directly from client components through the Supabase client.

Provider stack lives in [src/app/providers.tsx](src/app/providers.tsx): `Redux Provider → ThemeProvider → AuthProvider`. Redux ([src/store/](src/store/)) is legacy and only holds `examSlice` + `preferencesSlice` — new session state flows through the hooks below, not Redux.

### The three load-bearing modules

1. **[src/lib/services/supabaseService.ts](src/lib/services/supabaseService.ts)** — `SupabaseExamService` class, ~42 KB. Every read/write against the content and session tables goes through this one class. It handles DB→parsed-type transformation (see `DbExam` vs `ParsedExam` in [src/lib/types.ts](src/lib/types.ts)) and is the single surface a hook or API route should call. Add new queries as methods here rather than inlining `supabase.from(...)` in components.

2. **[src/lib/services/realtimeService.ts](src/lib/services/realtimeService.ts)** — `RealtimeService` class wrapping Supabase channels. Handles three orthogonal things:
   - Postgres Changes (per-table subscriptions for INSERT/UPDATE/DELETE)
   - Broadcast channels (session_update / answer_submitted / question_navigated events)
   - Presence tracking for active users
   Channels are cached in a `Map` keyed by name — always use `getOrCreateChannel` rather than `channel()` directly.

3. **[src/hooks/useOptimizedExamSession.ts](src/hooks/useOptimizedExamSession.ts)** — the main hook powering the exam-taking UI. Combines `supabaseExamService` + `realtimeService` into a `[state, actions]` tuple. It owns answer batching, connection status, presence, retry, pause/resume, and the time-spent counter. **Do not** sprinkle session logic into components — extend this hook or its siblings (`useExamResults`, `useExamData`, `useExamState`) instead.

### Data model and RLS

Schema, indexes, triggers, and RLS policies all live in a single baseline migration: [supabase/migrations/20260413125941_initial_schema.sql](supabase/migrations/20260413125941_initial_schema.sql). Ten tables split into two tiers:

- **Public content** (readable by anon): `exams`, `topics`, `topic_modules`, `questions`, `certification_info`
- **Per-user** (scoped to `auth.uid()` via RLS): `user_exam_sessions`, `session_questions`, `user_answers`, `exam_results`, `user_preferences`

Seed content for the public tier ships as [supabase/seed.sql](supabase/seed.sql) (1,916 rows, regenerated from a linked source project by `npm run seed:generate`). User-tier tables are never seeded.

When adding schema changes: `supabase migration new <name>`, edit the generated file, then `npm run db:push`. Do **not** edit the baseline migration in place after it has been applied to prod.

### Auth flow

[src/lib/auth/authService.ts](src/lib/auth/authService.ts) exposes `AuthService` (email/password + Google OAuth + password reset). [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) wraps it in a React context and is the only thing components should consume via `useAuth()`. OAuth redirects land on [src/app/auth/callback/page.tsx](src/app/auth/callback/page.tsx). Every new redirect URL (localhost, preview, prod) must be added under Supabase Dashboard → Authentication → URL Configuration or sign-in will silently fail.

### In-app documentation references

Two pages render markdown filenames in fallback copy as user-facing pointers:

- [src/app/exam/[examId]/setup/page.tsx](src/app/exam/[examId]/setup/page.tsx) references `SETUP-GUIDE.md`
- [src/app/exam/[examId]/certification-info/page.tsx](src/app/exam/[examId]/certification-info/page.tsx) references `SETUP-GUIDE.md` and `MIGRATION.md`

Keep those two files in the repo root. Deleting or renaming them breaks visible in-app links.

## Repo conventions worth knowing

- Path alias `@/*` → `src/*` (configured in [tsconfig.json](tsconfig.json)). Use it consistently.
- Tailwind v4 with `@tailwindcss/postcss` — there is no `tailwind.config.ts`, theme lives in `globals.css` via `@theme`.
- UI primitives are shadcn/Radix (see [components.json](components.json) and [src/components/ui/](src/components/ui/)).
- Forms use `react-hook-form` + Zod resolvers; validation schemas live next to the forms.
- Redux is present but **legacy**. Prefer the `useOptimizedExamSession` family of hooks for new work.
- `scripts/*.ts` are Node scripts executed via `tsx` and loaded with `dotenv.config({ path: '.env.local' })`. They require the service role key and must never be imported from `src/`.
- Deployment target is Vercel; there is no `vercel.json` or `vercel.ts` — default Next.js detection is used.
