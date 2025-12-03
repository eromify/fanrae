-- Migration: Add banner and social media fields to creators table
-- Run this in Supabase SQL Editor

-- Add banner_image_url field
ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- Add social media fields
ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS twitter_url TEXT;

-- Create index on username for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS creators_username_idx ON creators(username);

