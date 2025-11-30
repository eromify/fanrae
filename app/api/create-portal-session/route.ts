import { NextRequest, NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe/server'

/**
 * POST /api/create-portal-session
 * Creates a Stripe Billing Portal session
 * 
 * Body:
 * {
 *   session_id: string (Checkout session ID)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      )
    }

    const stripe = getStripeServerClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Retrieve the checkout session to get the customer ID
    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id)

    if (!checkoutSession.customer) {
      return NextResponse.json(
        { error: 'No customer found in checkout session' },
        { status: 400 }
      )
    }

    // Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: checkoutSession.customer as string,
      return_url: baseUrl,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}


