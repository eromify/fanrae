-- Migration: Add notifications table for creators
-- Run this in Supabase SQL Editor

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- The user who triggered the notification
  type TEXT NOT NULL CHECK (type IN ('like', 'subscribe', 'message')),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE, -- For like notifications
  message_id UUID, -- For message notifications (to be added later)
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS notifications_creator_id_idx ON notifications(creator_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Creators can view own notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creators
      WHERE creators.id = notifications.creator_id
      AND creators.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update own notifications"
  ON notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM creators
      WHERE creators.id = notifications.creator_id
      AND creators.user_id = auth.uid()
    )
  );

-- Function to create notification when user likes content
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Get creator_id from the content
  INSERT INTO notifications (creator_id, user_id, type, content_id)
  SELECT 
    c.creator_id,
    NEW.user_id,
    'like',
    NEW.content_id
  FROM content c
  WHERE c.id = NEW.content_id
  AND c.creator_id != NEW.user_id; -- Don't notify if creator likes their own content
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification on like
DROP TRIGGER IF EXISTS on_like_created ON likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

-- Function to create notification when user subscribes
CREATE OR REPLACE FUNCTION create_subscribe_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for the creator
  INSERT INTO notifications (creator_id, user_id, type)
  VALUES (NEW.creator_id, NEW.user_id, 'subscribe');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification on subscription
DROP TRIGGER IF EXISTS on_subscription_created ON user_subscriptions;
CREATE TRIGGER on_subscription_created
  AFTER INSERT ON user_subscriptions
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION create_subscribe_notification();

-- Function to update updated_at timestamp
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

