-- Migration: Add fan account fields to profiles table
-- Run this in Supabase SQL Editor after the main schema.sql

-- Add username field (unique, for fans)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add date_of_birth field (for age verification)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add user_type field to distinguish between fans and creators
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_type TEXT CHECK (user_type IN ('fan', 'creator'));

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Create index on user_type for filtering
CREATE INDEX IF NOT EXISTS profiles_user_type_idx ON profiles(user_type);

