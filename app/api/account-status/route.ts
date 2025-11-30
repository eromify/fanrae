import { NextRequest, NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe/server'

/**
 * GET /api/account-status
 * Gets the status of a Stripe Connect account
 * 
 * Query params:
 * - account: string (Stripe Connect account ID)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('account')

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing account ID' },
        { status: 400 }
      )
    }

    const stripe = getStripeServerClient()
    const account = await stripe.accounts.retrieve(accountId)

    return NextResponse.json({
      id: account.id,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      email: account.email,
    })
  } catch (error: any) {
    console.error('Error retrieving account status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve account status' },
      { status: 500 }
    )
  }
}

