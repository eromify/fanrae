-- Migration: Add subscription_payments table to track actual subscription payments
-- Run this in Supabase SQL Editor

-- ============================================
-- SUBSCRIPTION PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL, -- Amount paid (after platform commission)
  commission DECIMAL(10, 2) NOT NULL, -- Platform commission (20%)
  creator_amount DECIMAL(10, 2) NOT NULL, -- Amount to creator (80%)
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for subscription_payments
CREATE INDEX IF NOT EXISTS subscription_payments_creator_id_idx ON subscription_payments(creator_id);
CREATE INDEX IF NOT EXISTS subscription_payments_user_id_idx ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS subscription_payments_user_subscription_id_idx ON subscription_payments(user_subscription_id);
CREATE INDEX IF NOT EXISTS subscription_payments_stripe_invoice_id_idx ON subscription_payments(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS subscription_payments_status_idx ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS subscription_payments_created_at_idx ON subscription_payments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Subscription payments policies
CREATE POLICY "Creators can view own subscription payments"
  ON subscription_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creators
      WHERE creators.id = subscription_payments.creator_id
      AND creators.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
DROP TRIGGER IF EXISTS update_subscription_payments_updated_at ON subscription_payments;
CREATE TRIGGER update_subscription_payments_updated_at BEFORE UPDATE ON subscription_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

