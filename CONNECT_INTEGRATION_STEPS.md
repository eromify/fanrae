# Stripe Connect Integration Steps

Based on your Connect configuration (Marketplace, Express accounts, Stripe-hosted onboarding), here's what you need to implement:

## What We've Already Built ✅

1. ✅ **Account Creation** - `lib/stripe/connect.ts` → `createConnectAccount()`
2. ✅ **Account Onboarding Links** - `lib/stripe/connect.ts` → `createAccountLink()`
3. ✅ **Payment with Revenue Split** - `app/api/create-checkout-session/route.ts` (supports Connect)
4. ✅ **Webhook Handler** - `app/api/webhooks/stripe/route.ts`

## What You Need to Implement

### Step 1: Creator Onboarding API Route

Create `app/api/connect/onboard/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createConnectAccount, createAccountLink } from '@/lib/stripe/connect'

/**
 * POST /api/connect/onboard
 * Creates a Connect account and returns onboarding URL for creator
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { creatorId, email } = body

    if (!creatorId || !email) {
      return NextResponse.json(
        { error: 'Missing creatorId or email' },
        { status: 400 }
      )
    }

    // 1. Create Connect account
    const account = await createConnectAccount(creatorId, email)

    // 2. Create onboarding link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const accountLink = await createAccountLink(
      account.id,
      `${baseUrl}/creator/onboard/success?account_id=${account.id}`,
      `${baseUrl}/creator/onboard/refresh?account_id=${account.id}`
    )

    // 3. TODO: Save account.id to your database
    // await supabase
    //   .from('creators')
    //   .update({ stripe_connect_account_id: account.id })
    //   .eq('id', creatorId)

    return NextResponse.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    })
  } catch (error: any) {
    console.error('Error creating Connect account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create Connect account' },
      { status: 500 }
    )
  }
}
```

### Step 2: Creator Onboarding Success Page

Create `app/creator/onboard/success/page.tsx`:

```typescript
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getAccountStatus } from '@/lib/stripe/connect'

export default function OnboardSuccessPage() {
  const searchParams = useSearchParams()
  const accountId = searchParams.get('account_id')
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    if (accountId) {
      // Verify account status
      fetch(`/api/connect/account-status?account_id=${accountId}`)
        .then(res => res.json())
        .then(data => setStatus(data))
    }
  }, [accountId])

  if (!status) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Onboarding Complete!</h1>
      {status.details_submitted ? (
        <p>Your Stripe account is ready. You can now receive payouts.</p>
      ) : (
        <p>Please complete your onboarding.</p>
      )}
    </div>
  )
}
```

### Step 3: Account Status API Route

Create `app/api/connect/account-status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAccountStatus } from '@/lib/stripe/connect'

/**
 * GET /api/connect/account-status
 * Gets the status of a Connect account
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('account_id')

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing account_id' },
        { status: 400 }
      )
    }

    const status = await getAccountStatus(accountId)

    return NextResponse.json(status)
  } catch (error: any) {
    console.error('Error getting account status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get account status' },
      { status: 500 }
    )
  }
}
```

### Step 4: Update Webhook Handler for Connect Events

Update `app/api/webhooks/stripe/route.ts` to handle Connect-specific events:

```typescript
// Add these cases to your switch statement:

case 'account.updated':
  const account = event.data.object as Stripe.Account
  console.log('Connect account updated:', account.id)
  
  // TODO: Update database when creator completes onboarding
  // if (account.details_submitted) {
  //   await supabase
  //     .from('creators')
  //     .update({ stripe_connect_onboarding_complete: true })
  //     .eq('stripe_connect_account_id', account.id)
  // }
  break

case 'transfer.created':
  const transfer = event.data.object as Stripe.Transfer
  console.log('Transfer created:', transfer.id)
  // Creator received payout
  break

case 'transfer.failed':
  const failedTransfer = event.data.object as Stripe.Transfer
  console.log('Transfer failed:', failedTransfer.id)
  // Handle failed payout
  break
```

### Step 5: Frontend - Creator Onboarding Flow

When a creator signs up, call the onboarding API:

```typescript
// In your creator signup/onboarding component
const handleOnboardCreator = async () => {
  const response = await fetch('/api/connect/onboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creatorId: creator.id,
      email: creator.email,
    }),
  })

  const data = await response.json()
  
  if (data.onboardingUrl) {
    // Redirect creator to Stripe onboarding
    window.location.href = data.onboardingUrl
  }
}
```

## Integration Checklist

- [ ] Create `/api/connect/onboard` route
- [ ] Create `/api/connect/account-status` route  
- [ ] Create creator onboarding success page
- [ ] Update webhook handler for Connect events
- [ ] Add frontend button/flow to start creator onboarding
- [ ] Update database schema to store `stripe_connect_account_id`
- [ ] Test the full flow: creator signup → onboarding → payment → payout

## Testing

1. **Test Creator Onboarding:**
   - Create a test creator account
   - Call `/api/connect/onboard`
   - Complete Stripe onboarding flow
   - Verify account status

2. **Test Payment with Connect:**
   - Make sure creator has completed onboarding
   - Create checkout session with `creatorConnectAccountId`
   - Complete payment
   - Verify 80/20 split in Stripe Dashboard

3. **Test Webhooks:**
   - Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Trigger test events
   - Verify your handlers work

## Next Steps After Implementation

1. Get your **Connect Client ID** from Stripe Dashboard → Settings → Connect
2. Set up **Connect webhook** endpoint in Stripe Dashboard
3. Test the full flow in Stripe test mode
4. Deploy and test in production

