-- Fanrae Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- CREATORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  page_url TEXT UNIQUE NOT NULL, -- e.g., fanrae.com/@username
  display_name TEXT,
  bio TEXT,
  profile_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled')),
  creator_type TEXT CHECK (creator_type IN ('ai', 'human')), -- AI Creator or Human Creator
  stripe_connect_account_id TEXT UNIQUE, -- Stripe Connect Express account ID
  stripe_connect_onboarding_complete BOOLEAN DEFAULT false,
  payout_schedule TEXT DEFAULT 'weekly' CHECK (payout_schedule IN ('daily', 'weekly', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for creators
CREATE INDEX IF NOT EXISTS creators_user_id_idx ON creators(user_id);
CREATE INDEX IF NOT EXISTS creators_username_idx ON creators(username);
CREATE INDEX IF NOT EXISTS creators_page_url_idx ON creators(page_url);
CREATE INDEX IF NOT EXISTS creators_stripe_connect_account_id_idx ON creators(stripe_connect_account_id);

-- Enable Row Level Security
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;

-- Creators policies
CREATE POLICY "Anyone can view active creators"
  ON creators FOR SELECT
  USING (is_active = true);

CREATE POLICY "Creators can view own creator profile"
  ON creators FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own creator profile"
  ON creators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can update own profile"
  ON creators FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- CONTENT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  media_url TEXT NOT NULL, -- URL to the media file (stored in Supabase Storage)
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  is_unlocked BOOLEAN DEFAULT false, -- Whether content requires payment
  is_published BOOLEAN DEFAULT false,
  stripe_price_id TEXT, -- Stripe Price ID for this content
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for content
CREATE INDEX IF NOT EXISTS content_creator_id_idx ON content(creator_id);
CREATE INDEX IF NOT EXISTS content_is_published_idx ON content(is_published);
CREATE INDEX IF NOT EXISTS content_is_unlocked_idx ON content(is_unlocked);

-- Enable Row Level Security
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Content policies
CREATE POLICY "Anyone can view published content"
  ON content FOR SELECT
  USING (is_published = true);

CREATE POLICY "Creators can manage own content"
  ON content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM creators
      WHERE creators.id = content.creator_id
      AND creators.user_id = auth.uid()
    )
  );

-- ============================================
-- PURCHASES TABLE (one-time purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL, -- Total amount paid
  commission DECIMAL(10, 2) NOT NULL, -- Platform commission (20%)
  creator_amount DECIMAL(10, 2) NOT NULL, -- Amount to creator (80%)
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_transfer_id TEXT, -- Stripe transfer ID for creator payout
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for purchases
CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_content_id_idx ON purchases(content_id);
CREATE INDEX IF NOT EXISTS purchases_creator_id_idx ON purchases(creator_id);
CREATE INDEX IF NOT EXISTS purchases_stripe_payment_intent_id_idx ON purchases(stripe_payment_intent_id);

-- Enable Row Level Security
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Purchases policies
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Creators can view purchases of their content"
  ON purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creators
      WHERE creators.id = purchases.creator_id
      AND creators.user_id = auth.uid()
    )
  );

-- ============================================
-- USER SUBSCRIPTIONS TABLE (users subscribing to creators)
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, creator_id) -- One subscription per user-creator pair
);

-- Indexes for user subscriptions
CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_creator_id_idx ON user_subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_stripe_subscription_id_idx ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_status_idx ON user_subscriptions(status);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- User subscriptions policies
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Creators can view subscriptions to their content"
  ON user_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creators
      WHERE creators.id = user_subscriptions.creator_id
      AND creators.user_id = auth.uid()
    )
  );

-- ============================================
-- CREATOR SUBSCRIPTIONS TABLE (creators paying platform)
-- ============================================
CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for creator subscriptions
CREATE INDEX IF NOT EXISTS creator_subscriptions_creator_id_idx ON creator_subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS creator_subscriptions_stripe_subscription_id_idx ON creator_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS creator_subscriptions_status_idx ON creator_subscriptions(status);

-- Enable Row Level Security
ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;

-- Creator subscriptions policies
CREATE POLICY "Creators can view own platform subscription"
  ON creator_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creators
      WHERE creators.id = creator_subscriptions.creator_id
      AND creators.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_subscriptions_updated_at BEFORE UPDATE ON creator_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

