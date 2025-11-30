# How to Use Stripe Checkout with Connect

This guide shows you how to use the checkout system I've set up for your platform.

## What I've Created

1. **`lib/stripe/checkout.ts`** - Functions for creating checkout sessions with Connect
2. **`app/api/checkout/route.ts`** - API endpoint for creating checkout sessions
3. **`app/api/webhooks/stripe/route.ts`** - Webhook handler for Stripe events
4. **`components/SubscribeButton.tsx`** - Example React component

## How It Works

### Flow:
1. User clicks "Subscribe" button
2. Frontend calls `/api/checkout` with creator/price info
3. API creates Stripe Checkout session with Connect revenue split
4. User is redirected to Stripe Checkout page
5. After payment, Stripe sends webhook to `/api/webhooks/stripe`
6. You update your database and grant access

## Setup Steps

### 1. Update the API Route

In `app/api/checkout/route.ts`, you need to:

```typescript
// Replace this placeholder:
const creatorConnectAccountId = body.creatorConnectAccountId

// With actual database lookup:
import { createClient } from '@/lib/supabase/server'

const supabase = createClient()
const { data: creator } = await supabase
  .from('creators')
  .select('stripe_connect_account_id')
  .eq('id', creatorId)
  .single()

if (!creator?.stripe_connect_account_id) {
  return NextResponse.json(
    { error: 'Creator not onboarded to Stripe' },
    { status: 400 }
  )
}
```

### 2. Get User from Auth

In `app/api/checkout/route.ts`, get the authenticated user:

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Use user.id, user.email, etc.
```

### 3. Update SubscribeButton Component

In `components/SubscribeButton.tsx`, get the actual user:

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()

// Use user.id, user.email, user.user_metadata.full_name
```

### 4. Create Success/Cancel Pages

Create these pages in your app:

**`app/subscription/success/page.tsx`**:
```typescript
'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Verify subscription and grant access
    if (sessionId) {
      // Call your API to verify and update database
      fetch(`/api/subscription/verify?session_id=${sessionId}`)
    }
  }, [sessionId])

  return (
    <div>
      <h1>Subscription Successful!</h1>
      <p>You now have access to the creator's content.</p>
    </div>
  )
}
```

**`app/subscription/cancel/page.tsx`**:
```typescript
export default function CancelPage() {
  return (
    <div>
      <h1>Subscription Cancelled</h1>
      <p>You can try again anytime.</p>
    </div>
  )
}
```

### 5. Set Up Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook secret to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 6. Use the Component

```typescript
import SubscribeButton from '@/components/SubscribeButton'

export default function CreatorPage({ params }: { params: { creatorId: string } }) {
  // Get creator's price ID from your database
  const priceId = 'price_xxx' // From Stripe or your database
  const price = 2000 // $20.00 in cents

  return (
    <div>
      <h1>Creator's Page</h1>
      <SubscribeButton
        priceId={priceId}
        creatorId={params.creatorId}
        price={price}
        planName="Premium Access"
      />
    </div>
  )
}
```

## Important Notes

1. **Creator must be onboarded first**: Before users can subscribe, creators must complete Stripe Connect onboarding
2. **Price IDs**: You need to create Stripe Prices for each creator's subscription tier
3. **Revenue split**: Automatically handled - 80% to creator, 20% to platform
4. **Webhooks**: Essential for updating your database when payments succeed/fail

## Testing

Use Stripe test mode:
- Test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Any ZIP code

## Next Steps

1. ✅ Integrate database lookups in API route
2. ✅ Add authentication checks
3. ✅ Create success/cancel pages
4. ✅ Set up webhooks in Stripe Dashboard
5. ✅ Test the full flow


