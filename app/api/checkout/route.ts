import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession, getOrCreateCustomer } from '@/lib/stripe/checkout'
import { getStripeServerClient } from '@/lib/stripe/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * POST /api/checkout
 * Creates a Stripe Checkout session for user subscribing to creator
 * 
 * Body:
 * {
 *   priceId: string (Stripe Price ID)
 *   creatorId: string (Your creator ID from database)
 *   userId: string (Your user ID from database)
 *   userEmail: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { priceId, creatorId, userId, userEmail, userName } = body

    // Validate required fields
    if (!priceId || !creatorId || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId, creatorId, userId, userEmail' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Get creator's Connect account ID from database
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id, stripe_connect_account_id, stripe_connect_onboarding_complete, is_active')
      .eq('id', creatorId)
      .single()

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    if (!creator.is_active) {
      return NextResponse.json(
        { error: 'Creator account is not active' },
        { status: 400 }
      )
    }

    if (!creator.stripe_connect_account_id || !creator.stripe_connect_onboarding_complete) {
      return NextResponse.json(
        { error: 'Creator has not completed Stripe Connect onboarding' },
        { status: 400 }
      )
    }

    const creatorConnectAccountId = creator.stripe_connect_account_id

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(userId, userEmail, userName)

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create checkout session
    const session = await createCheckoutSession({
      priceId,
      creatorConnectAccountId,
      customerId: customer.id,
      userId,
      creatorId,
      successUrl: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/subscription/cancel`,
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

