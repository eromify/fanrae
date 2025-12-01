import { NextRequest, NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * POST /api/account
 * Creates a Stripe Connect Express account and saves it to database
 * 
 * Body:
 * {
 *   creatorId: string (UUID of creator from database)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { creatorId } = body

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Missing creatorId' },
        { status: 400 }
      )
    }

    const stripe = getStripeServerClient()
    const supabase = createSupabaseServerClient()

    // Verify creator exists
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id, user_id')
      .eq('id', creatorId)
      .single()

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Create Stripe Connect Express account
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
      metadata: {
        creator_id: creatorId,
      },
    })

    // Save Stripe Connect account ID to database
    const { error: updateError } = await supabase
      .from('creators')
      .update({
        stripe_connect_account_id: account.id,
        stripe_connect_onboarding_complete: false,
      })
      .eq('id', creatorId)

    if (updateError) {
      console.error('Error updating creator with Stripe account:', updateError)
      // Still return the account ID even if DB update fails
    }

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

