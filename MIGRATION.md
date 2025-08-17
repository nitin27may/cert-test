# Migration and Data Management Guide

This guide explains how to set up the database schema, apply RLS policies, migrate existing content, and feed or update new content in Supabase.

## 1) Prerequisites

- Supabase project URL, anon key, and service role key
- `.env.local` configured:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 2) Schema Setup

Run in Supabase SQL Editor:

- Create schema and tables
```sql
-- scripts/supabase-schema.sql
```

- Apply RLS policies
```sql
-- scripts/rls-policies.sql
```

- Enable realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE user_exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE session_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE exam_results;
```

### Enum Updates
If your source data introduces new enum values (e.g., `question_type = 'case-study'`), run:
```sql
-- scripts/update-question-type-enum.sql
```
This script adds missing values idempotently.

## 3) Data Migration (JSON → Supabase)

The migration script loads data from `public/data/exams.json` and inserts into Supabase.

Run:
```bash
npm run migrate:exam-data
```

Notes:
- Requires `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS during server-side inserts
- Handles batch inserts and large datasets
- Generates unique question IDs to avoid collisions across exams

### Common Errors
- Missing env vars → ensure `.env.local` is present and correct
- RLS violation → ensure migration uses service role key
- Invalid enum value → run `scripts/update-question-type-enum.sql`

## 4) Feeding New Data

You can add or update exam content via either:

### Option A: Next.js API (recommended)
Use the administrative endpoints (server-side only):
- `POST /api/exams` — create exam (with topics, questions, cert info)
- `PUT /api/exams` — update exam metadata

For adding/updating questions:
- Create an endpoint or use `supabaseExamService.createExam()` / `updateExam()` accepting arrays of question objects matching `ParsedQuestion`.
- Existing questions should match on `id` to update; new ones are inserted.

### Option B: Direct Supabase Scripts
Prepare a minimal script using `@supabase/supabase-js` with the service role key that:
- Upserts exams by `id`
- Upserts topics by composite (`exam_id`, `topic_id`)
- Upserts questions by `id`

This mirrors logic used in `scripts/migrate-exam-data.ts`.

## 5) Updating Existing Data

- Use `updateExam` and `getExamQuestions` server methods in `supabaseExamService`
- To update questions in bulk, pass an array of question objects (existing `id`s will be updated; missing `id`s inserted)
- Invalidate caches in the app where applicable

## 6) Security and RLS

- Public content (exams, topics, questions) is readable
- User-owned data (sessions, answers, results, preferences) is protected by RLS using `auth.uid()`
- Administrative writes should only use service role or server-side logic

## 7) Realtime

- Postgres Changes enable live updates for sessions, answers, and results
- Broadcast channels and presence power collaborative features
- Ensure publication includes relevant tables (see above)

## 8) Troubleshooting

- Permission denied altering database settings → hosted Supabase disallows superuser commands; use provided scripts only
- RLS violations during migration → ensure service role key is used
- Enum errors → run the enum update script
- Large dataset performance → rely on batching and indexes (already included)

## 9) Verification Checklist

- [ ] Tables created and RLS enabled
- [ ] Enum values cover all question types
- [ ] Data migrated (exams, topics, modules, questions)
- [ ] Realtime enabled for session/answer/result tables
- [ ] API endpoints reachable and secured

## 10) Reference

- Schema: `scripts/supabase-schema.sql`
- Policies: `scripts/rls-policies.sql`
- Enum updates: `scripts/update-question-type-enum.sql`
- Migration script: `scripts/migrate-exam-data.ts`
- Services: `src/lib/services/supabaseService.ts`, `src/lib/services/realtimeService.ts`
