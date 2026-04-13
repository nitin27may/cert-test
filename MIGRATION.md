# Database Migration and Management Guide

Complete guide for setting up, migrating, and managing the Azure Certification Practice Exam database in Supabase.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Backup and Recovery](#database-backup-and-recovery)
3. [Schema Setup](#schema-setup)
4. [Data Migration](#data-migration)
5. [Content Management](#content-management)
6. [Security and RLS](#security-and-rls)
7. [Real-time Configuration](#real-time-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance and Monitoring](#maintenance-and-monitoring)
10. [Verification Checklist](#verification-checklist)
11. [Reference Files](#reference-files)
12. [Emergency Recovery](#emergency-recovery)
13. [Support](#support)

## Prerequisites

### Required tools

- A Supabase project with admin access
- Node.js 18+ and npm
- Git for version control

### Environment variables

Create `.env.local` in your project root:

```bash
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Get Supabase keys

1. Go to the [Supabase Dashboard](https://app.supabase.com).
2. Select your project.
3. Navigate to **Settings → API**.
4. Copy the required keys:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

## Database Backup and Recovery

> **Important:** Always back up before major changes.

### 1. Automated backup (recommended)

```bash
# Create a backup before migration
npm run backup:db

# Restore from backup if needed
npm run restore:db
```

### 2. Manual backup via Supabase Dashboard

1. Go to **Database → Backups**.
2. Click **Create Backup**.
3. Download the backup file.
4. Store it securely (not in version control).

### 3. Manual backup via SQL

```sql
-- Create backup of critical tables
CREATE TABLE exams_backup AS SELECT * FROM exams;
CREATE TABLE questions_backup AS SELECT * FROM questions;
CREATE TABLE topics_backup AS SELECT * FROM topics;
CREATE TABLE certification_info_backup AS SELECT * FROM certification_info;

-- Backup user data (if any)
CREATE TABLE user_exam_sessions_backup AS SELECT * FROM user_exam_sessions;
CREATE TABLE user_answers_backup AS SELECT * FROM user_answers;
CREATE TABLE exam_results_backup AS SELECT * FROM exam_results;
```

### 4. Restore from backup

```sql
-- Restore tables if needed
DROP TABLE IF EXISTS exams CASCADE;
ALTER TABLE exams_backup RENAME TO exams;

DROP TABLE IF EXISTS questions CASCADE;
ALTER TABLE questions_backup RENAME TO questions;

-- Recreate indexes and constraints
-- (Run the schema creation script again)
```

### 5. Backup verification

```sql
-- Verify backup integrity
SELECT COUNT(*) FROM exams_backup;
SELECT COUNT(*) FROM questions_backup;
SELECT COUNT(*) FROM topics_backup;

-- Check data consistency
SELECT
  e.id AS exam_id,
  e.title,
  COUNT(q.id) AS question_count,
  COUNT(t.id) AS topic_count
FROM exams_backup e
LEFT JOIN questions_backup q ON e.id = q.exam_id
LEFT JOIN topics_backup t ON e.id = t.exam_id
GROUP BY e.id, e.title;
```

## Schema Setup

### 1. Create database schema

Apply the baseline migration via the Supabase CLI (preferred):

```bash
supabase link --project-ref <your-ref>
npm run db:push
```

Or paste the contents of `supabase/migrations/<timestamp>_initial_schema.sql` into the Supabase SQL Editor manually. This creates all tables, indexes, triggers, and basic RLS policies.

**What the schema creates:**

- **Core tables:** `exams`, `topics`, `topic_modules`, `questions`, `certification_info`
- **User tables:** `user_exam_sessions`, `session_questions`, `user_answers`, `exam_results`
- **System tables:** `user_preferences`, `audit_log`, `rate_limits`
- **Custom types:** `exam_difficulty`, `question_type`, `session_status`
- **Indexes:** performance optimization for common queries
- **Triggers:** automatic timestamp updates and audit logging

### 2. Verify schema creation

```sql
-- Check all tables were created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check custom types
SELECT typname, typtype
FROM pg_type
WHERE typname IN ('exam_difficulty', 'question_type', 'session_status');

-- Check indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public';
```

### 3. Apply RLS policies

```sql
-- Enable RLS on all tables
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Apply security policies (see supabase/migrations/<timestamp>_initial_schema.sql for full policies)
```

## Data Migration

### 1. Prepare source data

Seed content lives in `supabase/seed.sql` (generated from the source-of-truth project via `npm run seed:generate`):

```bash
ls -la supabase/seed.sql
wc -l supabase/seed.sql
```

### 2. Apply migrations and seed

```bash
# Push schema migrations to the linked Supabase project
npm run db:push

# Load public exam content into the database
psql "$SUPABASE_DB_URL" -f supabase/seed.sql

# Or, against a local Supabase stack, do both at once:
npm run db:reset
```

### 3. Migration verification

```sql
-- Verify data was migrated correctly
SELECT 'exams' AS table_name, COUNT(*) AS record_count FROM exams
UNION ALL
SELECT 'topics', COUNT(*) FROM topics
UNION ALL
SELECT 'questions', COUNT(*) FROM questions
UNION ALL
SELECT 'certification_info', COUNT(*) FROM certification_info;

-- Check relationships
SELECT
  e.title AS exam_title,
  COUNT(t.id) AS topic_count,
  COUNT(q.id) AS question_count
FROM exams e
LEFT JOIN topics t ON e.id = t.exam_id
LEFT JOIN questions q ON e.id = q.exam_id
GROUP BY e.id, e.title
ORDER BY e.title;
```

### 4. Handle migration errors

#### Common issues and solutions

**RLS policy violation**

```bash
# Error: "new row violates row-level security policy"
# Solution: Ensure you're using SUPABASE_SERVICE_ROLE_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
```

**Enum value errors**

```sql
-- Error: "invalid input value for enum question_type: 'case-study'"
-- Solution: Add missing enum values
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'case-study';
```

**Duplicate key errors**

```bash
# Error: "duplicate key value violates unique constraint"
# Solution: drop the local stack and re-run migrations + seed
npm run db:reset
```

## Content Management

### 1. Add new exams

```typescript
// Using the API endpoint
const newExam = {
  id: "az-204",
  title: "Azure Developer Associate",
  description: "Develop Azure compute solutions",
  total_questions: 200,
  networking_focus_percentage: 40,
};

await fetch("/api/exams", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(newExam),
});
```

### 2. Update existing content

```typescript
// Update exam metadata
const updateData = {
  id: "az-104",
  title: "Updated Azure Administrator Associate",
  description: "Enhanced description",
};

await fetch("/api/exams/az-104", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(updateData),
});
```

### 3. Bulk question updates

```typescript
// Add new questions to existing exam
const questionsToAdd = [
  {
    id: 10001,
    exam_id: "az-104",
    topic_id: "networking",
    type: "single",
    difficulty: "medium",
    question_text: "New question text...",
    options: ["Option A", "Option B", "Option C", "Option D"],
    correct_answers: [0],
    explanation: "Explanation text...",
  },
];

await fetch("/api/exams/az-104/questions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ questions: questionsToAdd }),
});
```

## Security and RLS

### 1. Row Level Security policies

```sql
-- Example: Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON user_exam_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Example: Users can only modify their own answers
CREATE POLICY "Users can modify own answers" ON user_answers
  FOR ALL USING (auth.uid() = (
    SELECT user_id FROM user_exam_sessions WHERE id = session_id
  ));
```

### 2. Audit logging

```sql
-- Enable audit logging for sensitive operations
CREATE TRIGGER log_exam_changes
  AFTER INSERT OR UPDATE OR DELETE ON exams
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_operation();
```

### 3. Rate limiting

```sql
-- Check rate limits before operations
SELECT check_rate_limit('exam_start', 10, 60); -- 10 attempts per hour
```

## Real-time Configuration

### 1. Enable real-time for tables

```sql
-- Enable real-time for user-facing tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE session_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE exam_results;
```

### 2. Verify real-time status

```sql
-- Check which tables have real-time enabled
SELECT schemaname, tablename, pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

## Troubleshooting

### 1. Migration issues

**Environment variables missing**

```bash
# Check if variables are loaded
node -e "
  require('dotenv').config({ path: '.env.local' });
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
"
```

**Permission denied errors**

```bash
# Error: "permission denied to set parameter"
# Solution: This is normal in hosted Supabase, skip those commands
```

**Connection timeout**

```bash
# Error: "connection timeout"
# Solution: Check network and Supabase status
curl -I https://your-project.supabase.co
```

### 2. Real-time issues

**Tables not syncing**

```sql
-- Check real-time configuration
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Re-enable if needed
ALTER PUBLICATION supabase_realtime ADD TABLE user_exam_sessions;
```

**RLS blocking real-time**

```sql
-- Ensure RLS policies allow authenticated users
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### 3. Performance issues

**Slow queries**

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM questions WHERE exam_id = 'az-104';

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

**Large dataset issues**

```bash
# Pull current public content from the linked project into seed.sql
npm run seed:generate
```

## Maintenance and Monitoring

### 1. Regular maintenance tasks

**Daily**

```sql
-- Clean up old rate limit data
SELECT cleanup_rate_limits();

-- Check for failed operations
SELECT COUNT(*) FROM audit_log WHERE operation = 'FAILED';
```

**Weekly**

```sql
-- Clean up old audit logs
SELECT cleanup_audit_logs();

-- Analyze table statistics
ANALYZE exams;
ANALYZE questions;
ANALYZE user_exam_sessions;
```

**Monthly**

```sql
-- Check table growth
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 2. Performance monitoring

**Connection monitoring**

```sql
-- Check active connections
SELECT state, COUNT(*) AS connection_count
FROM pg_stat_activity
GROUP BY state;

-- Check query performance
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

**Real-time monitoring**

```sql
-- Monitor real-time usage
SELECT schemaname, tablename, pubname, puballtables
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

### 3. Backup verification

**Test backup restoration**

```bash
# Create test environment
npm run create:test-env

# Restore backup to test environment
npm run restore:test-backup

# Verify data integrity
npm run verify:backup

# Clean up test environment
npm run cleanup:test-env
```

## Verification Checklist

After completing the migration, verify these items.

### Database setup

- [ ] All tables created successfully
- [ ] Custom types (enums) created
- [ ] Indexes and constraints applied
- [ ] RLS policies enabled and configured
- [ ] Real-time enabled for required tables

### Data migration

- [ ] All exams migrated with correct metadata
- [ ] Topics and modules properly linked
- [ ] Questions migrated with all properties
- [ ] Certification info populated
- [ ] Data relationships verified

### Security

- [ ] RLS policies working correctly
- [ ] Users can only access their own data
- [ ] Admin functions properly secured
- [ ] Audit logging enabled
- [ ] Rate limiting configured

### Real-time features

- [ ] Session updates sync across devices
- [ ] Answer submissions update in real-time
- [ ] Progress tracking works live
- [ ] Connection status monitoring active
- [ ] Presence tracking functional

### Performance

- [ ] Queries execute within acceptable time
- [ ] Real-time subscriptions don't overwhelm
- [ ] Batch operations complete successfully
- [ ] Indexes are being used effectively

## Reference Files

- **Schema migration:** `supabase/migrations/`
- **Seed content:** `supabase/seed.sql`
- **Seed regenerator:** `scripts/generate-seed.ts`
- **Services:** `src/lib/services/supabaseService.ts`
- **Types:** `src/lib/types.ts`
- **API routes:** `src/app/api/*`

## Emergency Recovery

If something goes wrong during migration:

1. Stop the migration script (Ctrl+C).
2. Check the error logs in the console.
3. Restore from backup using the procedures above.
4. Fix the issue (usually environment variables or RLS policies).
5. Re-run migration on a clean database.

## Support

For migration issues:

1. Check the console output for specific error messages.
2. Verify environment variables are correct.
3. Ensure the Supabase project has the required permissions.
4. Create an issue in the GitHub repository.

---

**Remember:** Always back up before major changes. The few minutes spent on backup can save hours of recovery work.
