import { NextRequest, NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * POST /api/content/[postId]/purchase
 * Create Stripe Checkout session for purchasing a premium post
 * 
 * Body:
 * {
 *   userId: string (required)
 *   userEmail: string (required)
 * }
 * 
 * Returns:
 * {
 *   url: string (Stripe checkout URL)
 *   error?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { postId } = params
    const body = await request.json()
    const { userId, userEmail } = body

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      )
    }

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()
    const stripe = getStripeServerClient()

    // Get the post
    const { data: post, error: postError } = await supabase
      .from('content')
      .select('id, title, description, price, media_url, creator_id, is_unlocked, is_published')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Check if post is premium
    if (!post.is_unlocked) {
      return NextResponse.json(
        { error: 'This post is not premium' },
        { status: 400 }
      )
    }

    // Check if post is published
    if (!post.is_published) {
      return NextResponse.json(
        { error: 'This post is not available' },
        { status: 400 }
      )
    }

    // Check if user already purchased this post
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('content_id', postId)
      .eq('status', 'completed')
      .single()

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'You have already purchased this post' },
        { status: 400 }
      )
    }

    // Get creator info
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id, username, display_name, stripe_connect_account_id')
      .eq('id', post.creator_id)
      .single()

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Check if creator has Stripe Connect account
    if (!creator.stripe_connect_account_id) {
      return NextResponse.json(
        { error: 'Creator payment setup incomplete' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const priceInCents = Math.round(post.price * 100)

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: post.title || 'Premium Post',
              description: post.description || 'Unlock premium content',
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: Math.round(priceInCents * 0.20), // 20% platform commission
        transfer_data: {
          destination: creator.stripe_connect_account_id,
        },
        metadata: {
          content_id: post.id,
          user_id: userId,
          creator_id: creator.id,
          type: 'premium_post',
        },
      },
      metadata: {
        content_id: post.id,
        user_id: userId,
        creator_id: creator.id,
        type: 'premium_post',
      },
      success_url: `${appUrl}/${creator.username}?purchased=${post.id}`,
      cancel_url: `${appUrl}/${creator.username}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating premium post checkout:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

