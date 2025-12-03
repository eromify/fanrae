import { NextRequest, NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe/server'

/**
 * POST /api/creator-subscription-checkout
 * Creates a Stripe Checkout session for creator subscription plans
 * 
 * Body:
 * {
 *   plan: 'monthly' | 'annual'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan } = body

    if (!plan || (plan !== 'monthly' && plan !== 'annual')) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly" or "annual"' },
        { status: 400 }
      )
    }

    // Get current user from request (passed from client)
    const { userId, userEmail } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      )
    }

    const stripe = getStripeServerClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Find the product by name
    const productName = plan === 'annual' ? 'Creator Annual Plan' : 'Creator Monthly Plan'
    const products = await stripe.products.list({
      limit: 100,
    })

    const product = products.data.find(p => p.name === productName)

    if (!product) {
      return NextResponse.json(
        { error: `Product "${productName}" not found in Stripe` },
        { status: 404 }
      )
    }

    // Get the price for this product
    const prices = await stripe.prices.list({
      product: product.id,
      limit: 1,
    })

    if (prices.data.length === 0) {
      return NextResponse.json(
        { error: `No price found for product "${productName}"` },
        { status: 404 }
      )
    }

    const price = prices.data[0]

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      billing_address_collection: 'auto',
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/onboarding?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/onboarding?canceled=true`,
      customer_email: userEmail || undefined,
      metadata: {
        user_id: userId,
        plan_type: plan,
        type: 'creator_subscription',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating creator subscription checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

