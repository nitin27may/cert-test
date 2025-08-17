# Azure Certification Practice Exams — Supabase-Powered

This project is a production-ready practice exam platform for Azure certifications backed by Supabase (database, auth, realtime) and Next.js. All content, sessions, answers, and results are stored and synced via Supabase APIs. No local JSON is used at runtime.

## Quick Start

1) Install dependencies
```bash
npm install
```

2) Configure environment
Create `.env.local` in the project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3) Run the app
```bash
npm run dev
# Open http://localhost:3000
```

## Database Setup (Supabase)

Run these in the Supabase SQL Editor:

- Schema/tables: `scripts/supabase-schema.sql`
- RLS policies: `scripts/rls-policies.sql` (if separated)
- Realtime publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE user_exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE session_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE exam_results;
```
- If your data contains extra enum values (e.g., `case-study`): `scripts/update-question-type-enum.sql`

For full database and migration guidance, see `MIGRATION.md`.

## Data Migration

Import existing JSON content into Supabase:
```bash
npm run migrate:exam-data
```
Requires `.env.local` with project URL and service role key. See `MIGRATION.md` for troubleshooting enum/RLS issues and how to feed or update exam content.

## Key Features

- Supabase-backed content (no local JSON at runtime)
- Realtime sync for sessions and answers
- Session resume, auto-save, and analytics
- RLS-secured user data

## App Structure

- UI pages: `/exams`, `/exam/[examId]/setup`, `/exam/[examId]/practice`, `/dashboard`
- APIs: `src/app/api/*` (exams, sessions, answers, results)
- Services: `src/lib/services/*` (Supabase + realtime)
- Hooks: `src/hooks/*` (`useOptimizedExamSession`, `useExamResults`, `useExamData`)

## Troubleshooting (Quick)

- Missing env vars during migration → ensure `.env.local` has URL and service role key
- RLS errors during migration → use service role key or see `MIGRATION.md`
- Enum errors (e.g., `case-study`) → run `scripts/update-question-type-enum.sql`

## Contributing

1) Create a feature branch
2) Make atomic commits
3) Ensure types and lint pass
4) Open a PR

## Deployment

See `DEPLOYMENT.md` for deployment instructions.



