# GitHub Actions Deployment Setup

This repository is configured to automatically deploy to Vercel when code is pushed to the `main` branch.

## Required GitHub Secrets

To enable deployment, you need to set up the following secrets in your GitHub repository settings (Settings > Secrets and variables > Actions):

### Vercel Configuration
- `VERCEL_TOKEN` - Your Vercel API token (get from [Vercel Dashboard](https://vercel.com/account/tokens))
- `ORG_ID` - Your Vercel organization ID
- `PROJECT_ID` - Your Vercel project ID




### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (e.g., `https://hivjlytasszmvudvzyht.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (optional, for server-side operations)

## Getting Vercel IDs

1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `cd exam && vercel link`
3. Get your IDs: `vercel env ls` or check `.vercel/project.json`

## Getting Supabase Keys

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`hivjlytasszmvudvzyht`)
3. Go to Settings > API
4. Copy the Project URL and anon/public key

## Manual Deployment

If you need to deploy manually:

```bash
cd exam
npm run build
vercel --prod
```

## Environment Variables in Local Development

Create a `.env.local` file in the `exam` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hivjlytasszmvudvzyht.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```
