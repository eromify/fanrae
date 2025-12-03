import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * GET /api/creator/sales
 * Get creator's total sales breakdown by category
 * 
 * Query params:
 * - userId: string (required)
 * 
 * Returns:
 * {
 *   totalSales: number
 *   subscriptions: number
 *   tips: number
 *   premiumPosts: number
 *   salesBreakdown: Array<{
 *     category: 'subscriptions' | 'tips' | 'premiumPosts'
 *     label: string
 *     amount: number
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
      .select('id, subscription_price')
      .eq('user_id', userId)
      .single()

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Calculate subscriptions from actual subscription payments
    // First check if subscription_payments table exists, if not, fall back to active subscriptions
    let subscriptionsTotal = 0
    let subscriptionsDailyData: Array<{ date: string; amount: number }> = []
    
    const { data: subscriptionPayments, error: subPaymentsError } = await supabase
      .from('subscription_payments')
      .select('amount, created_at')
      .eq('creator_id', creator.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: true })

    if (subPaymentsError) {
      // Table might not exist yet, fall back to calculating from active subscriptions
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('created_at, current_period_start, current_period_end, status')
        .eq('creator_id', creator.id)
        .eq('status', 'active')

      const subscriptionPrice = creator.subscription_price || 0
      subscriptionsTotal = subscriptions ? subscriptions.length * subscriptionPrice : 0
    } else {
      // Sum all subscription payments and group by day
      if (subscriptionPayments) {
        subscriptionsTotal = subscriptionPayments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0)
        
        // Group by day
        const dailyMap = new Map<string, number>()
        subscriptionPayments.forEach((payment) => {
          const date = new Date(payment.created_at).toISOString().split('T')[0] // YYYY-MM-DD
          const amount = parseFloat(payment.amount.toString())
          dailyMap.set(date, (dailyMap.get(date) || 0) + amount)
        })
        
        subscriptionsDailyData = Array.from(dailyMap.entries())
          .map(([date, amount]) => ({ date, amount }))
          .sort((a, b) => a.date.localeCompare(b.date))
      }
    }

    // Calculate tips from tips table
    const { data: tips, error: tipsError } = await supabase
      .from('tips')
      .select('amount, created_at')
      .eq('creator_id', creator.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: true })

    let tipsTotal = 0
    let tipsDailyData: Array<{ date: string; amount: number }> = []

    if (tipsError) {
      console.error('Error fetching tips:', tipsError)
      // Continue with tipsTotal = 0 if table doesn't exist yet
    } else if (tips) {
      // Sum all tips and group by day
      tipsTotal = tips.reduce((sum, tip) => sum + parseFloat(tip.amount.toString()), 0)

      // Group by day
      const dailyMap = new Map<string, number>()
      tips.forEach((tip) => {
        const date = new Date(tip.created_at).toISOString().split('T')[0] // YYYY-MM-DD
        const amount = parseFloat(tip.amount.toString())
        dailyMap.set(date, (dailyMap.get(date) || 0) + amount)
      })

      tipsDailyData = Array.from(dailyMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // Calculate premium posts from purchases table
    // All purchases in the purchases table are premium content purchases
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('amount, created_at')
      .eq('creator_id', creator.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: true })

    if (purchasesError) {
      throw purchasesError
    }

    // Sum all premium post purchases and group by day
    let premiumPostsTotal = 0
    let premiumPostsDailyData: Array<{ date: string; amount: number }> = []
    
    if (purchases) {
      premiumPostsTotal = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.amount.toString()), 0)
      
      // Group by day
      const dailyMap = new Map<string, number>()
      purchases.forEach((purchase) => {
        const date = new Date(purchase.created_at).toISOString().split('T')[0] // YYYY-MM-DD
        const amount = parseFloat(purchase.amount.toString())
        dailyMap.set(date, (dailyMap.get(date) || 0) + amount)
      })
      
      premiumPostsDailyData = Array.from(dailyMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // Total sales
    const totalSales = subscriptionsTotal + tipsTotal + premiumPostsTotal

    // Sales breakdown by category
    const salesBreakdown = [
      {
        category: 'subscriptions' as const,
        label: 'Subscriptions',
        amount: subscriptionsTotal
      },
      {
        category: 'tips' as const,
        label: 'Tips',
        amount: tipsTotal
      },
      {
        category: 'premiumPosts' as const,
        label: 'Premium Posts',
        amount: premiumPostsTotal
      }
    ]

    const response: any = {
      totalSales,
      subscriptions: subscriptionsTotal,
      tips: tipsTotal,
      premiumPosts: premiumPostsTotal,
      salesBreakdown
    }

    // Add daily data if available
    if (subscriptionsDailyData.length > 0 || tipsDailyData.length > 0 || premiumPostsDailyData.length > 0) {
      response.dailyData = {
        subscriptions: subscriptionsDailyData,
        tips: tipsDailyData,
        premiumPosts: premiumPostsDailyData
      }
    } else {
      response.dailyData = {
        subscriptions: [],
        tips: [],
        premiumPosts: []
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error fetching creator sales:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales data' },
      { status: 500 }
    )
  }
}

