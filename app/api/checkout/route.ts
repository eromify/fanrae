import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession, getOrCreateCustomer } from '@/lib/stripe/checkout'
import { getStripeServerClient } from '@/lib/stripe/server'

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

    // TODO: Get creator's Connect account ID from your database
    // For now, this is a placeholder - you'll need to query your Supabase database
    // const creator = await getCreatorFromDatabase(creatorId)
    // if (!creator || !creator.stripe_connect_account_id) {
    //   return NextResponse.json(
    //     { error: 'Creator not found or not onboarded to Stripe' },
    //     { status: 404 }
    //   )
    // }
    
    // TEMPORARY: You'll need to replace this with actual creator data from database
    const creatorConnectAccountId = body.creatorConnectAccountId
    if (!creatorConnectAccountId) {
      return NextResponse.json(
        { error: 'Creator Connect account ID required. Replace this with database lookup.' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(userId, userEmail, userName)

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create checkout session
    // TODO: Update success/cancel URLs to match your actual routes
    const session = await createCheckoutSession({
      priceId,
      creatorConnectAccountId,
      customerId: customer.id,
      userId,
      creatorId,
      successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/cancel`,
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

