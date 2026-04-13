# 🚀 Complete Exam System Setup Guide

## Overview

This guide walks you through setting up the complete exam system with Supabase database, real-time features, and comprehensive exam management capabilities.

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git

## 🛠 Step-by-Step Setup

### 1. Environment Configuration

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional: Admin configuration
NEXT_PUBLIC_ADMIN_EMAIL=admin@yourdomain.com
```

### 2. Install Dependencies

```bash
# Install new dependencies
npm install tsx

# Verify existing dependencies
npm install
```

### 3. Database Setup

#### 3.1 Apply schema and RLS

Use the Supabase CLI — the baseline migration in `supabase/migrations/` already includes tables, indexes, triggers, and RLS policies:

```bash
supabase link --project-ref <your-ref>
npm run db:push
```

If you'd rather paste SQL manually, the source file lives at `supabase/migrations/<timestamp>_initial_schema.sql`.

#### 3.2 Enable Real-time

In Supabase Dashboard:
1. Go to Database → Replication
2. Enable real-time for these tables:
   - `user_exam_sessions`
   - `user_answers`
   - `session_questions`
   - `exam_results`

### 4. Data Migration

#### 4.1 Apply schema and load seed content

```bash
# Push migrations to the linked Supabase project
npm run db:push

# Load public exam content (1,916 rows) from supabase/seed.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

#### 4.2 Verify Migration

Check your Supabase database to ensure:
- ✅ Exams table populated
- ✅ Topics and modules created
- ✅ Questions migrated with proper relationships
- ✅ Certification info populated

### 5. API Endpoints

The following API endpoints are now available:

#### Exam Management
- `GET /api/exams` - List all exams
- `GET /api/exams/[examId]` - Get exam details
- `POST /api/exams` - Create exam (admin)
- `PUT /api/exams` - Update exam (admin)

#### Session Management  
- `GET /api/sessions` - Get user sessions
- `POST /api/sessions` - Create new session
- `PUT /api/sessions` - Update session

#### Answer Management
- `GET /api/answers` - Get session answers
- `POST /api/answers` - Submit answer
- `PUT /api/answers` - Update answer

#### Results Management
- `GET /api/results` - Get user results
- `POST /api/results` - Complete session

### 6. Frontend Components

#### 6.1 Update Dashboard

Replace your current dashboard with the enhanced version:

```bash
# Replace src/app/dashboard/page.tsx with src/app/dashboard/enhanced-page.tsx
mv src/app/dashboard/enhanced-page.tsx src/app/dashboard/page.tsx
```

#### 6.2 Use New Hooks

Update your components to use the new hooks:

```typescript
import { useOptimizedExamSession } from '@/hooks/useOptimizedExamSession';
import { useExamResults } from '@/hooks/useExamResults';
```

### 7. Real-time Features Setup

#### 7.1 Real-time Service

The real-time service is automatically available:

```typescript
import { realtimeService } from '@/lib/services/realtimeService';

// Automatic table synchronization
await realtimeService.subscribeToTableChanges('channelName', config, onData);

// Presence tracking
await realtimeService.trackUserPresence(sessionId, presenceData);

// Broadcasting
await realtimeService.broadcastSessionEvent(sessionId, eventData);
```

#### 7.2 Optimized Session Management

```typescript
import { useOptimizedExamSession } from '@/hooks/useOptimizedExamSession';

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

## 🎯 Key Features Available

### ✅ Real-time Synchronization
- Automatic data sync across devices
- Real-time answer submission
- Live progress tracking
- Connection status monitoring

### ✅ Advanced Analytics
- Comprehensive exam results
- Topic performance analysis
- Difficulty trending
- Achievement system
- Personalized recommendations

### ✅ Session Management
- Resume interrupted exams
- Multi-device support
- Auto-save functionality
- Progress persistence

### ✅ Security & Performance
- Row Level Security (RLS)
- Rate limiting
- Audit logging
- Data protection

### ✅ Admin Features
- Exam content management
- User activity monitoring
- Analytics dashboard
- Data migration tools

## 🔧 Configuration Options

### Real-time Settings

```typescript
// Customize auto-sync behavior
const [sessionState, sessionActions] = useOptimizedExamSession({
  autoSaveInterval: 30000, // 30 seconds
  enableRealTimeSync: true
});
```

### Analytics Configuration

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

## 🚨 Troubleshooting

### Common Issues

#### 1. Migration Fails
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Verify the linked project and re-push migrations
supabase status
npm run db:push
```

#### 2. Real-time Not Working
```bash
# Verify real-time is enabled in Supabase Dashboard
# Check RLS policies are properly applied
# Ensure user is authenticated
```

#### 3. API Endpoints Return 401
```bash
# Check authentication headers
# Verify Supabase keys in environment
# Ensure RLS policies allow access
```

### Database Issues

#### Reset Database
```sql
-- WARNING: This deletes all data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run schema and migration
```

#### Check RLS Policies
```sql
-- View all policies
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 📊 Monitoring & Maintenance

### Health Checks

```typescript
// Check connection status
const status = realtimeService.getConnectionStatus();

// Monitor sync status in components
const { syncStatus, connectionStatus } = sessionState;
```

### Performance Monitoring

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

### Cleanup Tasks

```sql
-- Clean old rate limit data (run daily)
SELECT cleanup_rate_limits();

-- Clean old audit logs (run weekly)
SELECT cleanup_audit_logs();
```

## 🎉 Success Validation

After setup, verify these features work:

### ✅ Basic Functionality
- [ ] Can view available exams
- [ ] Can start new exam session
- [ ] Can submit answers
- [ ] Can resume interrupted session
- [ ] Can view results

### ✅ Real-time Features  
- [ ] Changes sync across browser tabs
- [ ] Connection status shows correctly
- [ ] Auto-save works during exam
- [ ] Progress updates in real-time

### ✅ Analytics
- [ ] Dashboard shows correct stats
- [ ] Recent results display
- [ ] Performance insights appear
- [ ] Achievements unlock

### ✅ Security
- [ ] Users can only see their own data
- [ ] Admin features require proper permissions
- [ ] Rate limiting prevents abuse
- [ ] Audit logs capture activities

## 🚀 Next Steps

1. **Customize UI**: Update styling and branding
2. **Add Features**: Implement additional exam types
3. **Mobile App**: Consider React Native implementation
4. **Analytics**: Add more detailed reporting
5. **Integrations**: Connect with learning management systems

## 🆘 Support

For issues or questions:

1. Review console logs for errors
2. Verify environment configuration
3. Test with a fresh user account
4. Check `MIGRATION.md` for backup/restore procedures

## 📈 Performance Tips

### Database Optimization
- Regularly analyze query performance
- Monitor table sizes and indexes
- Use connection pooling in production

### Real-time Optimization
- Limit real-time subscriptions to necessary tables
- Use filtering to reduce data transfer
- Implement proper cleanup on component unmount

### Frontend Optimization
- Use React.memo for expensive components
- Implement virtualization for large lists
- Optimize bundle size with proper imports

---

🎉 **Congratulations!** Your exam system is now fully set up with real-time synchronization, comprehensive analytics, and enterprise-grade security features.