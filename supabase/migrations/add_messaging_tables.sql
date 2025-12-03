-- Migration: Add messaging and tips tables
-- Run this in Supabase SQL Editor
--
-- IMPORTANT: Before running this migration, create a storage bucket named "messages" in Supabase:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket called "messages"
-- 3. Set it to public (or configure RLS policies as needed)

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, fan_id)
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS conversations_creator_id_idx ON conversations(creator_id);
CREATE INDEX IF NOT EXISTS conversations_fan_id_idx ON conversations(fan_id);
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx ON conversations(last_message_at DESC);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Creators can view own conversations"
  ON conversations FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Fans can view own conversations"
  ON conversations FOR SELECT
  USING (fan_id = auth.uid());

CREATE POLICY "Creators can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Fans can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (fan_id = auth.uid());

CREATE POLICY "Creators can update own conversations"
  ON conversations FOR UPDATE
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Fans can update own conversations"
  ON conversations FOR UPDATE
  USING (fan_id = auth.uid());

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL, -- Can be creator user_id or fan user_id
  sender_type TEXT NOT NULL CHECK (sender_type IN ('creator', 'fan')),
  content TEXT,
  media_url TEXT, -- For images/videos (creators only)
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
         OR fan_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
         OR fan_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- ============================================
-- TIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  commission DECIMAL(10, 2) NOT NULL, -- Platform commission (20%)
  creator_amount DECIMAL(10, 2) NOT NULL, -- Amount to creator (80%)
  stripe_payment_intent_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tips
CREATE INDEX IF NOT EXISTS tips_conversation_id_idx ON tips(conversation_id);
CREATE INDEX IF NOT EXISTS tips_fan_id_idx ON tips(fan_id);
CREATE INDEX IF NOT EXISTS tips_creator_id_idx ON tips(creator_id);
CREATE INDEX IF NOT EXISTS tips_status_idx ON tips(status);
CREATE INDEX IF NOT EXISTS tips_created_at_idx ON tips(created_at DESC);

-- Enable Row Level Security
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Tips policies
CREATE POLICY "Creators can view tips received"
  ON tips FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Fans can view own tips"
  ON tips FOR SELECT
  USING (fan_id = auth.uid());

CREATE POLICY "Fans can insert own tips"
  ON tips FOR INSERT
  WITH CHECK (fan_id = auth.uid());

-- Function to update updated_at timestamp
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation last_message_at when a message is inserted
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

