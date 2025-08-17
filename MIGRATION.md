# 🗄️ Database Migration & Management Guide

Complete guide for setting up, migrating, and managing the Azure Certification Practice Exam database in Supabase.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Backup & Recovery](#database-backup--recovery)
3. [Schema Setup](#schema-setup)
4. [Data Migration](#data-migration)
5. [Content Management](#content-management)
6. [Security & RLS](#security--rls)
7. [Real-time Configuration](#real-time-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance & Monitoring](#maintenance--monitoring)

## 🚀 Prerequisites

### Required Tools
- Supabase project with admin access
- Node.js 18+ and npm
- Git for version control

### Environment Variables
Create `.env.local` in your project root:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Get Supabase Keys
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the required keys:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

## 💾 Database Backup & Recovery

### ⚠️ IMPORTANT: Always Backup Before Major Changes

#### 1. Automated Backup (Recommended)
```bash
# Create a backup before migration
npm run backup:db

# Restore from backup if needed
npm run restore:db
```

#### 2. Manual Backup via Supabase Dashboard
1. Go to **Database** → **Backups**
2. Click **Create Backup**
3. Download the backup file
4. Store securely (not in version control)

#### 3. Manual Backup via SQL
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

#### 4. Restore from Backup
```sql
-- Restore tables if needed
DROP TABLE IF EXISTS exams CASCADE;
ALTER TABLE exams_backup RENAME TO exams;

DROP TABLE IF EXISTS questions CASCADE;
ALTER TABLE questions_backup RENAME TO questions;

-- Recreate indexes and constraints
-- (Run the schema creation script again)
```

#### 5. Backup Verification
```sql
-- Verify backup integrity
SELECT COUNT(*) FROM exams_backup;
SELECT COUNT(*) FROM questions_backup;
SELECT COUNT(*) FROM topics_backup;

-- Check data consistency
SELECT 
  e.id as exam_id,
  e.title,
  COUNT(q.id) as question_count,
  COUNT(t.id) as topic_count
FROM exams_backup e
LEFT JOIN questions_backup q ON e.id = q.exam_id
LEFT JOIN topics_backup t ON e.id = t.exam_id
GROUP BY e.id, e.title;
```

## 🏗️ Schema Setup

### 1. Create Database Schema
Run the complete schema creation script in Supabase SQL Editor:

```sql
-- Copy and paste the contents of scripts/supabase-schema.sql
-- This creates all tables, indexes, triggers, and basic RLS policies
```

**What the schema creates:**
- **Core Tables**: `exams`, `topics`, `topic_modules`, `questions`, `certification_info`
- **User Tables**: `user_exam_sessions`, `session_questions`, `user_answers`, `exam_results`
- **System Tables**: `user_preferences`, `audit_log`, `rate_limits`
- **Custom Types**: `exam_difficulty`, `question_type`, `session_status`
- **Indexes**: Performance optimization for common queries
- **Triggers**: Automatic timestamp updates and audit logging

### 2. Verify Schema Creation
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

### 3. Apply RLS Policies
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

-- Apply security policies (see scripts/rls-policies.sql for full policies)
```

## 📊 Data Migration

### 1. Prepare Source Data
Ensure your `public/data/exams.json` file is ready:
```bash
# Verify JSON file exists and is valid
ls -la public/data/exams.json
node -e "console.log(JSON.parse(require('fs').readFileSync('public/data/exams.json')).length + ' exams found')"
```

### 2. Run Migration Script
```bash
# Execute the migration
npm run migrate:exam-data

# Monitor progress in the console
# The script will show:
# - Tables being processed
# - Batch progress
# - Final summary
```

### 3. Migration Verification
```sql
-- Verify data was migrated correctly
SELECT 
  'exams' as table_name,
  COUNT(*) as record_count
FROM exams
UNION ALL
SELECT 
  'topics' as table_name,
  COUNT(*) as record_count
FROM topics
UNION ALL
SELECT 
  'questions' as table_name,
  COUNT(*) as record_count
FROM questions
UNION ALL
SELECT 
  'certification_info' as table_name,
  COUNT(*) as record_count
FROM certification_info;

-- Check relationships
SELECT 
  e.title as exam_title,
  COUNT(t.id) as topic_count,
  COUNT(q.id) as question_count
FROM exams e
LEFT JOIN topics t ON e.id = t.exam_id
LEFT JOIN questions q ON e.id = q.exam_id
GROUP BY e.id, e.title
ORDER BY e.title;
```

### 4. Handle Migration Errors

#### Common Issues & Solutions

**RLS Policy Violation**
```bash
# Error: "new row violates row-level security policy"
# Solution: Ensure you're using SUPABASE_SERVICE_ROLE_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
```

**Enum Value Errors**
```sql
-- Error: "invalid input value for enum question_type: 'case-study'"
-- Solution: Add missing enum values
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'case-study';
```

**Duplicate Key Errors**
```bash
# Error: "duplicate key value violates unique constraint"
# Solution: Clear existing data and re-run migration
npm run reset:db
npm run migrate:exam-data
```

## 📝 Content Management

### 1. Add New Exams
```typescript
// Using the API endpoint
const newExam = {
  id: "az-204",
  title: "Azure Developer Associate",
  description: "Develop Azure compute solutions",
  total_questions: 200,
  networking_focus_percentage: 40
};

await fetch('/api/exams', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newExam)
});
```

### 2. Update Existing Content
```typescript
// Update exam metadata
const updateData = {
  id: "az-104",
  title: "Updated Azure Administrator Associate",
  description: "Enhanced description"
};

await fetch('/api/exams/az-104', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData)
});
```

### 3. Bulk Question Updates
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
    explanation: "Explanation text..."
  }
];

await fetch('/api/exams/az-104/questions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ questions: questionsToAdd })
});
```

## 🔒 Security & RLS

### 1. Row Level Security Policies
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

### 2. Audit Logging
```sql
-- Enable audit logging for sensitive operations
CREATE TRIGGER log_exam_changes
  AFTER INSERT OR UPDATE OR DELETE ON exams
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_operation();
```

### 3. Rate Limiting
```sql
-- Check rate limits before operations
SELECT check_rate_limit('exam_start', 10, 60); -- 10 attempts per hour
```

## ⚡ Real-time Configuration

### 1. Enable Real-time for Tables
```sql
-- Enable real-time for user-facing tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE session_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE exam_results;
```

### 2. Verify Real-time Status
```sql
-- Check which tables have real-time enabled
SELECT schemaname, tablename, pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

## 🚨 Troubleshooting

### 1. Migration Issues

**Environment Variables Missing**
```bash
# Check if variables are loaded
node -e "
  require('dotenv').config({ path: '.env.local' });
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
"
```

**Permission Denied Errors**
```bash
# Error: "permission denied to set parameter"
# Solution: This is normal in hosted Supabase, skip those commands
```

**Connection Timeout**
```bash
# Error: "connection timeout"
# Solution: Check network and Supabase status
curl -I https://your-project.supabase.co
```

### 2. Real-time Issues

**Tables Not Syncing**
```sql
-- Check real-time configuration
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Re-enable if needed
ALTER PUBLICATION supabase_realtime ADD TABLE user_exam_sessions;
```

**RLS Blocking Real-time**
```sql
-- Ensure RLS policies allow authenticated users
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 3. Performance Issues

**Slow Queries**
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM questions WHERE exam_id = 'az-104';

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Large Dataset Issues**
```bash
# Use batch processing for large datasets
npm run migrate:exam-data -- --batch-size=500
```

## 🛠️ Maintenance & Monitoring

### 1. Regular Maintenance Tasks

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
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

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

### 2. Performance Monitoring

**Connection Monitoring**
```sql
-- Check active connections
SELECT 
  state,
  COUNT(*) as connection_count
FROM pg_stat_activity 
GROUP BY state;

-- Check query performance
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

**Real-time Monitoring**
```sql
-- Monitor real-time usage
SELECT 
  schemaname,
  tablename,
  pubname,
  puballtables
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### 3. Backup Verification

**Test Backup Restoration**
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

## 📋 Verification Checklist

After completing the migration, verify these items:

### ✅ Database Setup
- [ ] All tables created successfully
- [ ] Custom types (enums) created
- [ ] Indexes and constraints applied
- [ ] RLS policies enabled and configured
- [ ] Real-time enabled for required tables

### ✅ Data Migration
- [ ] All exams migrated with correct metadata
- [ ] Topics and modules properly linked
- [ ] Questions migrated with all properties
- [ ] Certification info populated
- [ ] Data relationships verified

### ✅ Security
- [ ] RLS policies working correctly
- [ ] Users can only access their own data
- [ ] Admin functions properly secured
- [ ] Audit logging enabled
- [ ] Rate limiting configured

### ✅ Real-time Features
- [ ] Session updates sync across devices
- [ ] Answer submissions update in real-time
- [ ] Progress tracking works live
- [ ] Connection status monitoring active
- [ ] Presence tracking functional

### ✅ Performance
- [ ] Queries execute within acceptable time
- [ ] Real-time subscriptions don't overwhelm
- [ ] Batch operations complete successfully
- [ ] Indexes are being used effectively

## 🔗 Reference Files

- **Schema**: `scripts/supabase-schema.sql`
- **Migration Script**: `scripts/migrate-exam-data.ts`
- **Services**: `src/lib/services/supabaseService.ts`
- **Types**: `src/lib/types.ts`
- **API Routes**: `src/app/api/*`

## 🆘 Emergency Recovery

If something goes wrong during migration:

1. **Stop the migration script** (Ctrl+C)
2. **Check the error logs** in the console
3. **Restore from backup** using the backup procedures above
4. **Fix the issue** (usually environment variables or RLS policies)
5. **Re-run migration** on clean database

## 📞 Support

For migration issues:
1. Check the console output for specific error messages
2. Verify environment variables are correct
3. Ensure Supabase project has proper permissions
4. Check `work-in-progress.md` for known issues
5. Create an issue in the GitHub repository

---

**Remember**: Always backup before major changes! 💾 The few minutes spent on backup can save hours of recovery work.
