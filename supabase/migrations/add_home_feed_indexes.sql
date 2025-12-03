-- Migration: Add indexes for home feed queries
-- Run this in Supabase SQL Editor

-- Index for user_subscriptions queries (user_id + status)
CREATE INDEX IF NOT EXISTS user_subscriptions_user_status_idx 
ON user_subscriptions(user_id, status) 
WHERE status = 'active';

-- Composite index for content queries (creator_id + is_published + is_unlocked + created_at)
CREATE INDEX IF NOT EXISTS content_feed_idx 
ON content(creator_id, is_published, is_unlocked, created_at DESC) 
WHERE is_published = true AND is_unlocked = false;

