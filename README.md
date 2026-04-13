# Azure Certification Practice Exams

A production-ready, real-time practice exam platform for Azure certifications, powered by Supabase (database, auth, realtime) and Next.js 15. It provides exam management, real-time synchronization across devices, analytics, and row-level security out of the box.

![Landing page](./image.png)

## Table of Contents

- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Available Scripts](#available-scripts)
- [Database Schema](#database-schema)
- [Core Services](#core-services)
- [Available Exams](#available-exams)
- [Authentication Setup](#authentication-setup)
- [Deployment](#deployment)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Key Features

- **Real-time exam sessions** — live synchronization across devices with auto-save
- **Advanced analytics** — performance insights, topic analysis, and progress tracking
- **Session management** — resume interrupted exams, multi-device support
- **Enterprise security** — Row Level Security (RLS), audit logging, rate limiting
- **Responsive design** — modern UI with dark mode support
- **Performance-optimized** — batched updates, connection monitoring, optimistic UI

## Architecture

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│   Next.js 15   │    │    Supabase    │    │   Real-time    │
│    Frontend    │◄──►│    Database    │◄──►│  Sync Engine   │
└────────────────┘    └────────────────┘    └────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  React hooks   │    │   PostgreSQL   │    │   WebSockets   │
│  & components  │    │   + RLS + Auth │    │   + presence   │
└────────────────┘    └────────────────┘    └────────────────┘
```

## Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- Git

### 2. Clone and install

```bash
git clone <your-repo-url>
cd cert-test
npm install
```

### 3. Environment setup

Create `.env.local` in the project root. Grab the values from Supabase Dashboard → Project Settings → API:

```bash
# Public — exposed to the browser
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Server-only — never commit, never prefix with NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Optional: Supabase CLI access token (Dashboard → Account → Access Tokens)
# Lets you run `supabase link` / `db push` without an interactive login
SUPABASE_ACCESS_TOKEN=sbp_...
```

### 4. Database setup

The project uses Supabase CLI migrations. The full schema lives in [supabase/migrations/](supabase/migrations/) and the seed content lives in [supabase/seed.sql](supabase/seed.sql).

**Linking to an existing project:**

```bash
supabase link --project-ref <your-project-ref>
supabase db push                             # apply migrations to the linked remote
psql "$DATABASE_URL" -f supabase/seed.sql    # load seed content (one-off)
```

**Spinning up a fresh Supabase project from scratch:**

1. Create a new project in the Supabase Dashboard. Note the project ref and the database password you set.
2. Link and push:
   ```bash
   supabase link --project-ref <new-ref>
   supabase db push
   ```
3. Load seed content (1,916 rows of public exam content — exams, topics, modules, questions, certification info):
   ```bash
   # Either run via psql against the connection string from Dashboard → Settings → Database
   psql "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" -f supabase/seed.sql
   # Or use supabase db reset on a local stack which auto-applies seed.sql
   supabase db reset
   ```
4. Regenerate `seed.sql` from the source-of-truth project at any time:
   ```bash
   npm run seed:generate
   ```

### 5. Start development

```bash
npm run dev
# Open http://localhost:3000
```

## Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run db:push          # Apply local migrations to the linked Supabase project
npm run db:reset         # Local Supabase: drop, re-run migrations, replay seed.sql
npm run seed:generate    # Pull current public content from the linked project into supabase/seed.sql
npm run backup:db        # Dump all tables (including user data) as JSON + SQL into backups/
npm run restore:db       # Restore a backup created by backup:db
npm run verify:backup    # Sanity-check a backup against the live database
```

## Database Schema

The system uses a relational schema with the following core tables:

| Table                | Purpose           | Key features                          |
| -------------------- | ----------------- | ------------------------------------- |
| `exams`              | Exam metadata     | Title, description, question count    |
| `topics`             | Exam domains      | Weightage, modules, relationships     |
| `questions`          | Question bank     | Types, difficulty, explanations       |
| `user_exam_sessions` | User sessions     | Progress, status, timing              |
| `user_answers`       | User responses    | Correctness, timing, flags            |
| `exam_results`       | Performance data  | Scores, analytics, insights           |
| `certification_info` | Cert details      | Requirements, resources, career paths |

## Core Services

### Supabase service layer

- CRUD operations for all entities
- Data transformation and validation
- Relationship management with automatic joins
- Batch operations for performance

### Real-time service

- Postgres Changes for live updates
- Broadcast channels for cross-client communication
- Presence tracking for user activity
- Auto-sync manager for optimized updates

### Session management

- Automatic session creation and resumption
- Real-time progress tracking across devices
- Pause/resume functionality with state persistence
- Connection monitoring and offline handling

## Available Exams

- **AZ-104** — Azure Administrator Associate (200+ questions, 60% networking focus)
- **AZ-305** — Azure Solutions Architect Expert (150+ questions, 50% networking focus)
- **AI-900** — Azure AI Fundamentals (100+ questions, AI/ML focus)

## Authentication Setup

The app uses Supabase Auth with two flows out of the box: email/password and Google OAuth. Both are handled in [src/lib/auth/authService.ts](src/lib/auth/authService.ts) and surfaced via [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx). After authentication the provider redirects back to [/auth/callback](src/app/auth/callback/page.tsx).

### 1. Enable email/password auth

1. Supabase Dashboard → Authentication → Providers → **Email**.
2. Toggle **Enable Email provider** on.
3. Decide whether to require email confirmation. If enabled, Supabase sends a confirmation link before the user can sign in. The app already calls `signUp` with `emailRedirectTo: <origin>/auth/callback`.
4. Customize the confirmation, magic-link, and password-reset email templates under Authentication → Email Templates if you want branded copy.

### 2. Configure redirect URLs

Authentication → URL Configuration:

- **Site URL**: your production origin, e.g. `https://exams.example.com`
- **Additional Redirect URLs** — add every environment that needs to complete an OAuth round trip:
  ```
  http://localhost:3000/auth/callback
  http://localhost:3000/auth/reset-password
  https://*.vercel.app/auth/callback
  https://exams.example.com/auth/callback
  https://exams.example.com/auth/reset-password
  ```

The wildcard line covers Vercel preview deployments. Without these entries, Supabase rejects the redirect after sign-in.

### 3. Enable Google OAuth (optional)

1. Google Cloud Console → APIs & Services → Credentials → **Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Authorized JavaScript origins: `https://<project-ref>.supabase.co` and your production site URL.
4. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (Supabase, not your app — Supabase handles the exchange and then forwards to `/auth/callback`).
5. Copy the Client ID and Client Secret into Supabase Dashboard → Authentication → Providers → **Google**, then enable the provider.
6. The "Sign in with Google" button in [src/app/auth/login/](src/app/auth/login/) starts working immediately — no app code changes required.

### 4. Row Level Security

RLS policies ship in the initial migration ([supabase/migrations/20260413125941_initial_schema.sql](supabase/migrations/20260413125941_initial_schema.sql)). Public content (`exams`, `topics`, `topic_modules`, `questions`, `certification_info`) is readable by anyone; per-user tables (`user_exam_sessions`, `user_answers`, `exam_results`, `user_preferences`) are scoped to `auth.uid()`. Verify the policies were applied:

```bash
supabase db remote commit --dry-run    # shows any drift between local migrations and remote
```

### 5. Test the flow

```bash
npm run dev
# 1. Visit http://localhost:3000/auth/signup and create a test account
# 2. Confirm via email if confirmations are enabled
# 3. Sign in at /auth/login
# 4. Verify the session by visiting /dashboard
```

## Deployment

### Vercel (recommended)

**One-time setup:**

1. Push the repo to GitHub.
2. In the Vercel Dashboard → **Add New → Project** → import the repo. Vercel auto-detects Next.js — accept the defaults.
3. Under **Environment Variables**, add the same keys as `.env.local` (mark `SUPABASE_SERVICE_ROLE_KEY` as Sensitive):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy. Vercel will assign a preview URL and a production URL.
5. Copy both URLs into Supabase Dashboard → Authentication → URL Configuration as described in the [Authentication Setup](#authentication-setup) section. Without this step, sign-in succeeds in Supabase but the redirect back to your app fails.

**Ongoing deploys:**

```bash
# Preview (any branch)
vercel

# Promote current branch to production
vercel --prod
```

Or just push to `main` — Vercel auto-deploys connected branches.

### Connecting to Supabase from Vercel

The frontend talks to Supabase directly using the public `NEXT_PUBLIC_*` keys, so no extra Vercel-side network configuration is needed. The service role key is only used by server-side scripts (`scripts/*.ts`) and any future API routes — never expose it in client components.

If you use Vercel's Supabase Marketplace integration, environment variables get auto-provisioned and stay in sync. Otherwise, when you rotate keys in Supabase you must update them in Vercel and redeploy.

### Schema changes after the first deploy

```bash
supabase migration new add_new_table   # creates supabase/migrations/<ts>_add_new_table.sql
# edit the file
supabase db push                       # applies to the linked remote
git add supabase/migrations && git commit -m "schema: add new table"
git push                               # Vercel redeploys with the new schema in place
```

### Database backups

The `npm run backup:db` script dumps every table (including user data) to `backups/<timestamp>/` as both JSON and SQL — see [scripts/backup-database.ts](scripts/backup-database.ts). For a verified-from-prod schema snapshot, use `supabase db dump --schema public -f schema.sql` (requires the DB password). See [MIGRATION.md](./MIGRATION.md) for restore procedures.

## Development

### Project structure

```
src/
├── app/                # Next.js 15 app router
│   ├── api/            # API endpoints
│   ├── dashboard/      # User dashboard
│   ├── exam/           # Exam interface
│   └── auth/           # Authentication pages
├── components/         # Reusable UI components
├── contexts/           # React contexts (Auth, Theme)
├── hooks/              # Custom React hooks
├── lib/                # Utilities and services
│   ├── services/       # Supabase and real-time services
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Helper functions
└── store/              # Redux store (legacy support)
```

### Key components

- **`useOptimizedExamSession`** — main exam session hook
- **`useExamResults`** — results and analytics hook
- **`useExamData`** — exam data management hook
- **`ThemeContext`** — dark/light mode management
- **`AuthContext`** — authentication state management

## Troubleshooting

### Common issues

1. **Migration fails** — check environment variables and the service role key.
2. **Real-time not working** — verify RLS policies and real-time settings.
3. **Authentication errors** — check Supabase keys and auth configuration.
4. **Performance issues** — monitor database queries and real-time subscriptions.

## Documentation

- [MIGRATION.md](./MIGRATION.md) — database backup and restore procedures
- [SETUP-GUIDE.md](./SETUP-GUIDE.md) — end-to-end system setup walkthrough
- [CLAUDE.md](./CLAUDE.md) — guidance for Claude Code when working in this repo

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a pull request.

### Development guidelines

- Follow TypeScript best practices.
- Update documentation for new features.
- Follow the existing code style.

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
