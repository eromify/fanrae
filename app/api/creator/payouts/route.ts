import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'
import { getStripeServerClient } from '@/lib/stripe/server'

/**
 * GET /api/creator/payouts
 * Get creator's payout information
 * 
 * Query params:
 * - userId: string (required)
 * 
 * Returns:
 * {
 *   totalRevenue: number
 *   totalNetProfit: number (80% of revenue)
 *   availablePayouts: number (ready to payout now)
 *   pendingPayouts: number (available soon)
 *   totalReceived: number (already paid out)
 *   payouts: Array<{
 *     id: string
 *     amount: number
 *     status: string
 *     created_at: string
 *     paid_date: string | null
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Get creator ID
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id, stripe_connect_account_id')
      .eq('user_id', userId)
      .single()

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Calculate total revenue from all sources
    // 1. Subscription payments
    let subscriptionRevenue = 0
    let subscriptionNetProfit = 0
    const { data: subscriptionPayments } = await supabase
      .from('subscription_payments')
      .select('amount, creator_amount')
      .eq('creator_id', creator.id)
      .eq('status', 'completed')

    if (subscriptionPayments) {
      subscriptionRevenue = subscriptionPayments.reduce(
        (sum, payment) => sum + parseFloat(payment.amount.toString()),
        0
      )
      subscriptionNetProfit = subscriptionPayments.reduce(
        (sum, payment) => sum + parseFloat(payment.creator_amount.toString()),
        0
      )
    }

    // 2. Premium post purchases
    let premiumPostsRevenue = 0
    const { data: purchases } = await supabase
      .from('purchases')
      .select('amount, creator_amount')
      .eq('creator_id', creator.id)
      .eq('status', 'completed')

    if (purchases) {
      premiumPostsRevenue = purchases.reduce(
        (sum, purchase) => sum + parseFloat(purchase.amount.toString()),
        0
      )
    }

    // 3. Tips
    let tipsRevenue = 0
    let tipsNetProfit = 0
    const { data: tips } = await supabase
      .from('tips')
      .select('amount, creator_amount')
      .eq('creator_id', creator.id)
      .eq('status', 'completed')

    if (tips) {
      tipsRevenue = tips.reduce(
        (sum, tip) => sum + parseFloat(tip.amount.toString()),
        0
      )
      tipsNetProfit = tips.reduce(
        (sum, tip) => sum + parseFloat(tip.creator_amount.toString()),
        0
      )
    }

    // Total revenue (including platform commission)
    const totalRevenue = subscriptionRevenue + premiumPostsRevenue + tipsRevenue

    // Calculate net profit (80% of revenue - what creator actually receives)
    // From purchases: creator_amount is already 80%
    let premiumPostsNetProfit = 0
    if (purchases) {
      premiumPostsNetProfit = purchases.reduce(
        (sum, purchase) => sum + parseFloat(purchase.creator_amount.toString()),
        0
      )
    }

    const totalNetProfit = subscriptionNetProfit + premiumPostsNetProfit + tipsNetProfit

    // Get all payouts
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('id, amount, status, created_at, paid_date, stripe_transfer_id')
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false })

    if (payoutsError) {
      throw payoutsError
    }

    // Calculate payout totals
    const paidPayouts = payouts?.filter(p => p.status === 'paid') || []
    const pendingPayouts = payouts?.filter(p => p.status === 'pending' || p.status === 'processing') || []

    const totalReceived = paidPayouts.reduce(
      (sum, payout) => sum + parseFloat(payout.amount.toString()),
      0
    )

    const pendingAmount = pendingPayouts.reduce(
      (sum, payout) => sum + parseFloat(payout.amount.toString()),
      0
    )

    // Available payouts = total net profit - total received - pending
    const availablePayouts = Math.max(0, totalNetProfit - totalReceived - pendingAmount)

    return NextResponse.json({
      totalRevenue,
      totalNetProfit,
      availablePayouts,
      pendingPayouts: pendingAmount,
      totalReceived,
      payouts: payouts || []
    })
  } catch (error: any) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payout data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/creator/payouts
 * Initiate a payout
 * 
 * Body:
 * {
 *   userId: string (required)
 *   amount: number (optional, defaults to available amount)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, amount } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()
    const stripe = getStripeServerClient()

    // Get creator
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id, stripe_connect_account_id, stripe_connect_onboarding_complete')
      .eq('user_id', userId)
      .single()

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Check if Stripe Connect is set up
    if (!creator.stripe_connect_account_id || !creator.stripe_connect_onboarding_complete) {
      return NextResponse.json(
        { error: 'Stripe Connect account not set up. Please complete onboarding first.' },
        { status: 400 }
      )
    }

    // Get available payout amount
    const payoutResponse = await fetch(`${request.nextUrl.origin}/api/creator/payouts?userId=${userId}`)
    const payoutData = await payoutResponse.json()

    if (!payoutData.availablePayouts || payoutData.availablePayouts <= 0) {
      return NextResponse.json(
        { error: 'No funds available for payout' },
        { status: 400 }
      )
    }

    const payoutAmount = amount || payoutData.availablePayouts

    if (payoutAmount > payoutData.availablePayouts) {
      return NextResponse.json(
        { error: 'Payout amount exceeds available balance' },
        { status: 400 }
      )
    }

    if (payoutAmount < 1) {
      return NextResponse.json(
        { error: 'Minimum payout amount is $1.00' },
        { status: 400 }
      )
    }

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        creator_id: creator.id,
        amount: payoutAmount,
        status: 'pending',
        payout_method: 'instant'
      })
      .select()
      .single()

    if (payoutError) {
      throw payoutError
    }

    // Create Stripe Transfer (instant payout)
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(payoutAmount * 100), // Convert to cents
        currency: 'usd',
        destination: creator.stripe_connect_account_id,
        metadata: {
          creator_id: creator.id,
          payout_id: payout.id,
          type: 'creator_payout'
        }
      })

      // Update payout with transfer ID
      await supabase
        .from('payouts')
        .update({
          stripe_transfer_id: transfer.id,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', payout.id)

      return NextResponse.json({
        success: true,
        payout: {
          id: payout.id,
          amount: payoutAmount,
          status: 'processing',
          transfer_id: transfer.id
        }
      })
    } catch (stripeError: any) {
      // If transfer fails, update payout status
      await supabase
        .from('payouts')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', payout.id)

      console.error('Stripe transfer error:', stripeError)
      return NextResponse.json(
        { error: stripeError.message || 'Failed to process payout' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error initiating payout:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate payout' },
      { status: 500 }
    )
  }
}

