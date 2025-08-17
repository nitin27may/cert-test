# Environment Variables Setup Guide

## Required Environment Variables

Create a `.env.local` file in the root directory of your project with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Where to Find These Values

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. You'll find:
   - **Project URL**: This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key**: This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: This is your `SUPABASE_SERVICE_ROLE_KEY`

## Important Notes

- **NEVER commit your `.env.local` file to version control**
- The `NEXT_PUBLIC_` prefix makes variables available in the browser
- The `SUPABASE_SERVICE_ROLE_KEY` should only be used server-side (API routes, migration scripts)
- Make sure `.env.local` is in your `.gitignore` file

## Example .env.local

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Verifying Your Setup

After creating your `.env.local` file, you can test if the environment variables are loaded correctly:

```bash
# Run the migration script
npm run migrate:exam-data
```

If you see errors about missing environment variables, double-check:
1. The file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
2. The file is in the root directory of your project
3. The variable names match exactly (case-sensitive)
4. There are no quotes around the values unless they contain spaces

## Troubleshooting Migration Errors

### Row Level Security (RLS) Policy Error

If you see: `new row violates row-level security policy for table "exams"`

This means RLS is blocking the migration. You have two options:

**Option 1: Use Service Role Key (Recommended)**
- Ensure you're using `SUPABASE_SERVICE_ROLE_KEY` not the anon key
- The service role key has full access and bypasses RLS

**Option 2: Temporarily Disable RLS**
1. Run `disable-rls-for-migration.sql` in Supabase SQL Editor
2. Run the migration: `npm run migrate:exam-data`
3. Re-enable RLS using the commands at the bottom of the disable script

**Important**: Never disable RLS in production!
