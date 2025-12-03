-- Migration: Add payouts table to track creator payouts
-- Run this in Supabase SQL Editor

-- ============================================
-- PAYOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL, -- Amount being paid out
  stripe_transfer_id TEXT UNIQUE, -- Stripe transfer ID
  stripe_payout_id TEXT, -- Stripe payout ID (if using Stripe Payouts)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'canceled')),
  payout_method TEXT DEFAULT 'instant' CHECK (payout_method IN ('instant', 'standard')),
  available_date TIMESTAMPTZ, -- When funds become available for payout
  paid_date TIMESTAMPTZ, -- When payout was completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payouts
CREATE INDEX IF NOT EXISTS payouts_creator_id_idx ON payouts(creator_id);
CREATE INDEX IF NOT EXISTS payouts_status_idx ON payouts(status);
CREATE INDEX IF NOT EXISTS payouts_stripe_transfer_id_idx ON payouts(stripe_transfer_id);
CREATE INDEX IF NOT EXISTS payouts_created_at_idx ON payouts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Payouts policies
CREATE POLICY "Creators can view own payouts"
  ON payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creators
      WHERE creators.id = payouts.creator_id
      AND creators.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
DROP TRIGGER IF EXISTS update_payouts_updated_at ON payouts;
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

