import { NextRequest, NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe/server'

/**
 * POST /api/account_link
 * Creates an account link for Stripe Connect onboarding
 * 
 * Body:
 * {
 *   account: string (Stripe Connect account ID)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { account } = body

    if (!account) {
      return NextResponse.json(
        { error: 'Missing account ID' },
        { status: 400 }
      )
    }

    const stripe = getStripeServerClient()
    // For live mode, use ngrok HTTPS URL if available, otherwise use environment variable
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'

    const accountLink = await stripe.accountLinks.create({
      account: account,
      return_url: `${origin}/return/${account}`,
      refresh_url: `${origin}/refresh/${account}`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error: any) {
    console.error('Error creating account link:', error)
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create account link',
        details: error.type || error.code || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

