-- SQL to create an active annual subscription for vinzroas@gmail.com
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_user_id UUID;
  v_creator_id UUID;
  v_username TEXT := 'vinzroas'; -- You can change this username
BEGIN
  -- Get user_id from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'vinzroas@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email vinzroas@gmail.com not found';
  END IF;

  -- Update profile to set user_type as creator
  UPDATE profiles
  SET user_type = 'creator'
  WHERE id = v_user_id;

  -- Insert or update creator record
  INSERT INTO creators (
    user_id,
    username,
    page_url,
    display_name,
    subscription_status,
    is_active
  )
  VALUES (
    v_user_id,
    v_username,
    '@' || v_username,
    'Test Creator',
    'active',
    true
  )
  ON CONFLICT (username) DO UPDATE
  SET 
    subscription_status = 'active',
    is_active = true,
    updated_at = NOW();

  -- Get creator_id
  SELECT id INTO v_creator_id
  FROM creators
  WHERE user_id = v_user_id;

  -- Insert active annual subscription
  INSERT INTO creator_subscriptions (
    creator_id,
    stripe_subscription_id,
    stripe_customer_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  )
  VALUES (
    v_creator_id,
    'sub_test_annual_' || v_creator_id::TEXT, -- Test subscription ID
    'cus_test_' || v_user_id::TEXT, -- Test customer ID
    'active',
    NOW(), -- Start now
    NOW() + INTERVAL '1 year', -- End 1 year from now (annual plan)
    false
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE
  SET 
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 year',
    cancel_at_period_end = false,
    updated_at = NOW();

  RAISE NOTICE 'Successfully created active annual subscription for vinzroas@gmail.com';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Creator ID: %', v_creator_id;
END $$;

