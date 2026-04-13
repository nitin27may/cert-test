# Complete Exam System Setup Guide

## Overview

This guide walks you through setting up the complete exam system with the Supabase database, real-time features, and exam management capabilities.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Setup](#step-by-step-setup)
3. [Key Features Available](#key-features-available)
4. [Configuration Options](#configuration-options)
5. [Troubleshooting](#troubleshooting)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Success Validation](#success-validation)
8. [Next Steps](#next-steps)
9. [Support](#support)
10. [Performance Tips](#performance-tips)

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- Git

## Step-by-Step Setup

### 1. Environment configuration

Create a `.env.local` file in your project root:

```bash
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional: admin configuration
NEXT_PUBLIC_ADMIN_EMAIL=admin@yourdomain.com
```

### 2. Install dependencies

```bash
# Install new dependencies
npm install tsx

# Verify existing dependencies
npm install
```

### 3. Database setup

#### 3.1 Apply schema and RLS

Use the Supabase CLI — the baseline migration in `supabase/migrations/` already includes tables, indexes, triggers, and RLS policies:

```bash
supabase link --project-ref <your-ref>
npm run db:push
```

If you'd rather paste SQL manually, the source file lives at `supabase/migrations/<timestamp>_initial_schema.sql`.

#### 3.2 Enable real-time

In the Supabase Dashboard:

1. Go to **Database → Replication**.
2. Enable real-time for these tables:
   - `user_exam_sessions`
   - `user_answers`
   - `session_questions`
   - `exam_results`

### 4. Data migration

#### 4.1 Apply schema and load seed content

```bash
# Push migrations to the linked Supabase project
npm run db:push

# Load public exam content (1,916 rows) from supabase/seed.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

#### 4.2 Verify migration

Check your Supabase database to ensure:

- [ ] `exams` table is populated
- [ ] Topics and modules are created
- [ ] Questions are migrated with the correct relationships
- [ ] Certification info is populated

### 5. API endpoints

The following API endpoints are available.

#### Exam management

- `GET /api/exams` — list all exams
- `GET /api/exams/[examId]` — get exam details
- `POST /api/exams` — create exam (admin)
- `PUT /api/exams` — update exam (admin)

#### Session management

- `GET /api/sessions` — get user sessions
- `POST /api/sessions` — create new session
- `PUT /api/sessions` — update session

#### Answer management

- `GET /api/answers` — get session answers
- `POST /api/answers` — submit answer
- `PUT /api/answers` — update answer

#### Results management

- `GET /api/results` — get user results
- `POST /api/results` — complete session

### 6. Frontend components

#### 6.1 Update dashboard

Replace your current dashboard with the enhanced version:

```bash
# Replace src/app/dashboard/page.tsx with src/app/dashboard/enhanced-page.tsx
mv src/app/dashboard/enhanced-page.tsx src/app/dashboard/page.tsx
```

#### 6.2 Use new hooks

Update your components to use the new hooks:

```typescript
import { useOptimizedExamSession } from "@/hooks/useOptimizedExamSession";
import { useExamResults } from "@/hooks/useExamResults";
```

### 7. Real-time features setup

#### 7.1 Real-time service

The real-time service is automatically available:

```typescript
import { realtimeService } from "@/lib/services/realtimeService";

// Automatic table synchronization
await realtimeService.subscribeToTableChanges("channelName", config, onData);

// Presence tracking
await realtimeService.trackUserPresence(sessionId, presenceData);

// Broadcasting
await realtimeService.broadcastSessionEvent(sessionId, eventData);
```

#### 7.2 Optimized session management

```typescript
import { useOptimizedExamSession } from "@/hooks/useOptimizedExamSession";

function ExamComponent() {
  const [sessionState, sessionActions] = useOptimizedExamSession();

  // Features included:
  // - Automatic sync
  // - Real-time updates
  // - Connection monitoring
  // - Optimistic updates
  // - Presence tracking
}
```

## Key Features Available

### Real-time synchronization

- Automatic data sync across devices
- Real-time answer submission
- Live progress tracking
- Connection status monitoring

### Advanced analytics

- Comprehensive exam results
- Topic performance analysis
- Difficulty trending
- Achievement system
- Personalized recommendations

### Session management

- Resume interrupted exams
- Multi-device support
- Auto-save functionality
- Progress persistence

### Security and performance

- Row Level Security (RLS)
- Rate limiting
- Audit logging
- Data protection

### Admin features

- Exam content management
- User activity monitoring
- Analytics dashboard
- Data migration tools

## Configuration Options

### Real-time settings

```typescript
// Customize auto-sync behavior
const [sessionState, sessionActions] = useOptimizedExamSession({
  autoSaveInterval: 30000, // 30 seconds
  enableRealTimeSync: true,
});
```

### Analytics configuration

```typescript
// Customize analytics tracking
const [resultsState, resultsActions] = useExamResults(userId);

// Available analytics:
// - Topic performance
// - Difficulty analysis
// - Progress trends
// - Achievement tracking
// - Recommendations
```

## Troubleshooting

### Common issues

#### 1. Migration fails

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Verify the linked project and re-push migrations
supabase status
npm run db:push
```

#### 2. Real-time not working

- Verify real-time is enabled in the Supabase Dashboard.
- Check that RLS policies are properly applied.
- Ensure the user is authenticated.

#### 3. API endpoints return 401

- Check authentication headers.
- Verify Supabase keys in the environment.
- Ensure RLS policies allow access.

### Database issues

#### Reset database

```sql
-- WARNING: This deletes all data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run schema and migration
```

#### Check RLS policies

```sql
-- View all policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

## Monitoring and Maintenance

### Health checks

```typescript
// Check connection status
const status = realtimeService.getConnectionStatus();

// Monitor sync status in components
const { syncStatus, connectionStatus } = sessionState;
```

### Performance monitoring

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public';

-- Monitor real-time usage
SELECT * FROM pg_stat_subscription;
```

### Cleanup tasks

```sql
-- Clean old rate limit data (run daily)
SELECT cleanup_rate_limits();

-- Clean old audit logs (run weekly)
SELECT cleanup_audit_logs();
```

## Success Validation

After setup, verify these features work.

### Basic functionality

- [ ] Can view available exams
- [ ] Can start a new exam session
- [ ] Can submit answers
- [ ] Can resume an interrupted session
- [ ] Can view results

### Real-time features

- [ ] Changes sync across browser tabs
- [ ] Connection status shows correctly
- [ ] Auto-save works during the exam
- [ ] Progress updates in real-time

### Analytics

- [ ] Dashboard shows correct stats
- [ ] Recent results display
- [ ] Performance insights appear
- [ ] Achievements unlock

### Security

- [ ] Users can only see their own data
- [ ] Admin features require proper permissions
- [ ] Rate limiting prevents abuse
- [ ] Audit logs capture activities

## Next Steps

1. **Customize UI:** update styling and branding.
2. **Add features:** implement additional exam types.
3. **Mobile app:** consider a React Native implementation.
4. **Analytics:** add more detailed reporting.
5. **Integrations:** connect with learning management systems.

## Support

For issues or questions:

1. Review console logs for errors.
2. Verify environment configuration.
3. Test with a fresh user account.
4. Check [MIGRATION.md](./MIGRATION.md) for backup and restore procedures.

## Performance Tips

### Database optimization

- Regularly analyze query performance.
- Monitor table sizes and indexes.
- Use connection pooling in production.

### Real-time optimization

- Limit real-time subscriptions to necessary tables.
- Use filtering to reduce data transfer.
- Implement proper cleanup on component unmount.

### Frontend optimization

- Use `React.memo` for expensive components.
- Implement virtualization for large lists.
- Optimize bundle size with proper imports.

---

Your exam system is now fully set up with real-time synchronization, comprehensive analytics, and row-level security.
