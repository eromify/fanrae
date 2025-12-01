# Supabase Database Schema Setup

This directory contains the database schema for the Fanrae platform.

## How to Run the Schema

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/sylupwafctdmhllfggjq
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `schema.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press `Cmd/Ctrl + Enter`)

### Option 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
supabase db push
```

## What Gets Created

### Tables

1. **profiles** - User profiles (extends Supabase auth.users)
2. **creators** - Creator accounts with Stripe Connect info
3. **content** - Content items created by creators
4. **purchases** - One-time purchases of content
5. **user_subscriptions** - Users subscribing to creators (monthly)
6. **creator_subscriptions** - Creators paying platform subscription (monthly)

### Features

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Proper foreign key relationships
- ✅ Indexes for performance
- ✅ Automatic `updated_at` timestamps
- ✅ Auto-create profile on user signup
- ✅ Check constraints for data validation

## Row Level Security Policies

All tables have RLS enabled with appropriate policies:

- **profiles**: Users can only view/update their own profile
- **creators**: Anyone can view active creators, creators can manage their own
- **content**: Anyone can view published content, creators can manage their own
- **purchases**: Users can view their purchases, creators can view purchases of their content
- **user_subscriptions**: Users can view their subscriptions, creators can view subscriptions to their content
- **creator_subscriptions**: Creators can view their own platform subscription

## Next Steps

After running the schema:

1. ✅ Database tables are created
2. ✅ RLS policies are set up
3. ✅ Triggers are configured
4. Next: Update API routes to use these tables
5. Next: Build frontend components

## Troubleshooting

If you get errors:

1. **"relation already exists"**: Tables might already exist. You can drop them first or use `CREATE TABLE IF NOT EXISTS` (already included)
2. **"permission denied"**: Make sure you're running as the database owner
3. **"function already exists"**: Functions might already exist. The schema uses `CREATE OR REPLACE` where possible

## Verifying the Schema

After running, verify tables were created:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see all 6 tables listed
3. Check that RLS is enabled (lock icon should be visible)

