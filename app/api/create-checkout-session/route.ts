import { NextRequest, NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe/server'

/**
 * POST /api/create-checkout-session
 * Creates a Stripe Checkout session
 * 
 * Body:
 * {
 *   lookup_key: string (Price lookup key)
 *   creatorId?: string (Optional: for Connect revenue split)
 *   creatorConnectAccountId?: string (Optional: for Connect revenue split)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lookup_key, creatorId, creatorConnectAccountId } = body

    if (!lookup_key) {
      return NextResponse.json(
        { error: 'Missing lookup_key' },
        { status: 400 }
      )
    }

    const stripe = getStripeServerClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Get prices by lookup key
    const prices = await stripe.prices.list({
      lookup_keys: [lookup_key],
      expand: ['data.product'],
    })

    if (prices.data.length === 0) {
      return NextResponse.json(
        { error: 'Price not found' },
        { status: 404 }
      )
    }

    // Build checkout session params
    const sessionParams: any = {
      billing_address_collection: 'auto',
      line_items: [
        {
          price: prices.data[0].id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?canceled=true`,
    }

    // Add Stripe Connect revenue split if creator info provided
    if (creatorConnectAccountId && creatorId) {
      sessionParams.subscription_data = {
        application_fee_percent: 20, // 20% commission to platform
        transfer_data: {
          destination: creatorConnectAccountId, // Creator's Connect account
        },
        metadata: {
          creator_id: creatorId,
          type: 'user_to_creator_subscription',
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}


