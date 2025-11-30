# Final Stripe Connect Setup Steps

## Step 1: Set Up Webhooks in Stripe Dashboard

1. **Go to Stripe Dashboard:**
   - Visit https://dashboard.stripe.com
   - Make sure you're in **Test mode** (toggle in top right)

2. **Navigate to Webhooks:**
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**

3. **Configure Webhook Endpoint:**
   - **Endpoint URL:** 
     - For local testing: Use Stripe CLI (see below)
     - For production: `https://yourdomain.com/api/webhooks/stripe`
   
   - **Description:** "Fanrae Connect Webhooks" (optional)

4. **Select Events to Listen To:**
   Check these events:
   - ✅ `account.updated` (Connect account updated)
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.trial_will_end`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `transfer.created` (Creator payout created)
   - ✅ `transfer.failed` (Creator payout failed)
   - ✅ `entitlements.active_entitlement_summary.updated` (if using entitlements)

5. **Copy the Webhook Secret:**
   - After creating the endpoint, click on it
   - Find **Signing secret** (starts with `whsec_`)
   - Copy it

6. **Add to `.env.local`:**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

## Step 2: Test Locally with Stripe CLI (Recommended)

For local development, use Stripe CLI to forward webhooks:

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe CLI:**
   ```bash
   stripe login
   ```

3. **Forward Webhooks to Local Server:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Copy the Webhook Signing Secret:**
   - The CLI will show a webhook signing secret
   - It looks like: `whsec_...`
   - Add this to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

5. **Test Webhook Events:**
   ```bash
   # Trigger test events
   stripe trigger account.updated
   stripe trigger customer.subscription.created
   ```

## Step 3: Test the Onboarding Flow

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Visit:** http://localhost:3000

3. **Test the flow:**
   - Click "Create an account!" button
   - Should create a Connect account
   - Click "Add information" button
   - Should redirect to Stripe onboarding
   - Complete the onboarding (use test data)
   - Should return to `/return/[accountId]`

## Step 4: Verify Everything Works

Check that:
- ✅ Connect accounts are being created
- ✅ Account links redirect to Stripe
- ✅ Webhooks are being received (check terminal/logs)
- ✅ Account status updates work

## Step 5: Get Your Connect Client ID (For Future Use)

1. **Go to Stripe Dashboard:**
   - **Settings** → **Connect** → **Settings**

2. **Find Client ID:**
   - Look for **Client ID** (starts with `ca_`)
   - Copy it

3. **Add to `.env.local`:**
   ```env
   STRIPE_CONNECT_CLIENT_ID=ca_your_client_id_here
   ```

## Step 6: Production Setup (When Ready)

1. **Switch to Live Mode:**
   - Toggle to **Live mode** in Stripe Dashboard

2. **Create Production Webhook:**
   - Same steps as Step 1, but use your production URL
   - Get the **live** webhook secret

3. **Update Environment Variables:**
   - Use live keys in production
   - Use live webhook secret

## Troubleshooting

### Webhooks Not Working?
- Check that `STRIPE_WEBHOOK_SECRET` is in `.env.local`
- Verify webhook URL is correct
- Check Stripe Dashboard → Webhooks → Recent events
- Look for failed deliveries

### Onboarding Not Working?
- Check browser console for errors
- Verify API routes are working (`/api/account`, `/api/account_link`)
- Check that Stripe keys are correct
- Make sure you're in the right mode (test vs live)

### Need Help?
- Check Stripe Dashboard → Developers → Logs
- Review webhook event details in Dashboard
- Check your Next.js server logs

