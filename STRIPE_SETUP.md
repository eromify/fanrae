# Stripe Connect Setup Guide for Fanrae

This guide explains how to set up Stripe Connect for your platform, which enables automatic payouts to creators.

## Why Stripe Connect?

Stripe Connect is the industry standard for marketplace/platform models because it:
- ✅ Handles automatic payouts to creators (no manual transfers from your account)
- ✅ Supports flexible payout schedules (daily, weekly, monthly)
- ✅ Automatically handles tax forms (1099s) for creators
- ✅ Provides compliance and fraud protection
- ✅ Allows creators to access their own Stripe dashboard
- ✅ Handles revenue splitting automatically (80% creator, 20% platform)

## Step 1: Enable Stripe Connect in Your Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Connect** → **Get started**
3. Choose **Express accounts** (recommended for your use case)
4. Complete the Connect onboarding process

## Step 2: Get Your Connect Keys

After enabling Connect, you'll need:

1. **Connect Client ID** (OAuth client ID)
   - Go to **Settings** → **Connect** → **Settings**
   - Find your **Client ID** (starts with `ca_`)
   - Add to `.env.local` as `STRIPE_CONNECT_CLIENT_ID`

2. **Connect Webhook Secret**
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Set endpoint URL: `https://yourdomain.com/api/webhooks/stripe-connect`
   - Select events:
     - `account.updated`
     - `account.application.deauthorized`
     - `transfer.created`
     - `transfer.failed`
   - Copy the **Signing secret** (starts with `whsec_`)
   - Add to `.env.local` as `STRIPE_CONNECT_WEBHOOK_SECRET`

## Step 3: Create Creator Subscription Product

Creators pay a monthly subscription to use your platform:

1. Go to **Products** → **Add product**
2. Name: "Creator Subscription" (or similar)
3. Pricing: Set your monthly fee (e.g., $29/month)
4. Billing: Recurring, Monthly
5. Copy the **Price ID** (starts with `price_`)
6. Store this in your database/config for creating creator subscriptions

## Step 4: Update Your Database Schema

Add these columns to your `creators` table in Supabase:

```sql
ALTER TABLE creators 
ADD COLUMN stripe_connect_account_id TEXT,
ADD COLUMN stripe_connect_onboarding_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN payout_schedule TEXT DEFAULT 'monthly' CHECK (payout_schedule IN ('daily', 'weekly', 'monthly'));
```

## Step 5: Creator Onboarding Flow

When a creator signs up:

1. **Create Connect Account**: Use `createConnectAccount()` from `lib/stripe/connect.ts`
2. **Store Account ID**: Save `account.id` to `creators.stripe_connect_account_id`
3. **Create Account Link**: Use `createAccountLink()` to get onboarding URL
4. **Redirect Creator**: Send them to the onboarding URL
5. **Handle Return**: When they return, check `account.details_submitted` to confirm completion
6. **Update Database**: Set `stripe_connect_onboarding_complete = true`

## Step 6: Payment Flow

When a customer purchases creator content:

1. Use `createPaymentWithSplit()` from `lib/stripe/connect.ts`
2. This automatically:
   - Charges the customer
   - Takes 20% commission for your platform
   - Transfers 80% to the creator's Connect account
   - Creator receives payout based on their schedule (daily/weekly/monthly)

## Step 7: Payout Schedule Management

Creators can choose their payout schedule:

- Use `updatePayoutSchedule()` to change a creator's schedule
- Schedules: `daily`, `weekly`, or `monthly`
- Creators receive payouts automatically based on their schedule

## Important Notes

### Fees
- Stripe charges: 2.9% + $0.30 per transaction (standard)
- Connect Express accounts: Additional 0.25% + $0.25 per transfer
- **Total fees**: ~3.15% + $0.55 per transaction
- Factor this into your pricing strategy

### Compliance
- Stripe automatically handles 1099-K forms for creators (US)
- Creators must complete onboarding before receiving payouts
- You're responsible for platform-level compliance

### Testing
- Use Stripe Test Mode for development
- Test Connect accounts in test mode
- Use test card numbers for payments
- Test the full flow: onboarding → payment → payout

## Environment Variables Summary

Add these to your `.env.local`:

```env
# Existing Stripe keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# New Connect keys
STRIPE_CONNECT_CLIENT_ID=ca_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# Platform settings
PLATFORM_COMMISSION_RATE=0.20
```

## Next Steps

1. ✅ Enable Stripe Connect in dashboard
2. ✅ Get Connect Client ID and Webhook Secret
3. ✅ Create Creator Subscription product
4. ✅ Update database schema
5. ✅ Implement creator onboarding API route
6. ✅ Implement payment with split API route
7. ✅ Set up webhook handlers for Connect events
8. ✅ Test the full flow in test mode

## Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Express Accounts Guide](https://stripe.com/docs/connect/express-accounts)
- [Revenue Sharing](https://stripe.com/docs/connect/charges#sharing)


