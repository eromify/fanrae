import { NextRequest, NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * POST /api/creator/[username]/subscribe
 * Creates a Stripe Checkout session for subscribing to a creator
 * 
 * Body:
 * {
 *   userId: string (optional, if logged in)
 *   userEmail: string (optional, if logged in)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params
    const body = await request.json()
    const { userId, userEmail } = body

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Remove @ if present
    const cleanUsername = username.replace('@', '').toLowerCase()

    // Get creator profile
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id, username, subscription_price, stripe_connect_account_id')
      .eq('username', cleanUsername)
      .eq('is_active', true)
      .single()

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    if (!creator.subscription_price) {
      return NextResponse.json(
        { error: 'Creator has not set a subscription price' },
        { status: 400 }
      )
    }

    // If user is not logged in, return a flag to redirect to signup
    if (!userId) {
      return NextResponse.json(
        { requiresAuth: true },
        { status: 401 }
      )
    }

    // Check if user already has an active subscription to this creator
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('creator_id', creator.id)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'You already have an active subscription to this creator' },
        { status: 400 }
      )
    }

    const stripe = getStripeServerClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create a Stripe Price for this subscription (if using Stripe Connect)
    // For now, we'll create a checkout session with the creator's price
    // Note: This assumes the creator has set up Stripe Connect
    
    // Create checkout session
    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `@${creator.username}`,
              description: `Monthly subscription to ${creator.username}`,
            },
            recurring: {
              interval: 'month',
            },
            unit_amount: Math.round(creator.subscription_price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/${username}?subscription=success`,
      cancel_url: `${baseUrl}/${username}?subscription=canceled`,
      customer_email: userEmail || undefined,
      metadata: {
        user_id: userId,
        creator_id: creator.id,
        creator_username: creator.username,
        type: 'user_subscription',
      },
    }

    // If creator has Stripe Connect account, add revenue split
    if (creator.stripe_connect_account_id) {
      sessionParams.subscription_data = {
        application_fee_percent: 20, // 20% platform commission
        transfer_data: {
          destination: creator.stripe_connect_account_id,
        },
        metadata: {
          user_id: userId,
          creator_id: creator.id,
          creator_username: creator.username,
          type: 'user_subscription',
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // If using Stripe Connect, we need to create the session differently
    // For now, we'll create a standard checkout session
    // The webhook will handle creating the user_subscription record

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating subscription checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

