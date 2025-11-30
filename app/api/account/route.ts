import { NextRequest, NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe/server'

/**
 * POST /api/account
 * Creates a Stripe Connect Express account
 */
export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeServerClient()

    const account = await stripe.accounts.create({
      controller: {
        stripe_dashboard: {
          type: 'express',
        },
        fees: {
          payer: 'application',
        },
        losses: {
          payments: 'application',
        },
      },
    })

    return NextResponse.json({
      account: account.id,
    })
  } catch (error: any) {
    console.error(
      'An error occurred when calling the Stripe API to create an account',
      error
    )
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

