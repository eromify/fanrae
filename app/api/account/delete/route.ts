import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'
import { getStripeServerClient } from '@/lib/stripe/server'

/**
 * DELETE /api/account/delete
 * Delete user account and cancel all subscriptions
 * 
 * Headers:
 * - Authorization: Bearer <access_token> (optional, can also use userId query param)
 * 
 * Query params:
 * - userId: string (required if no auth token)
 * 
 * Returns:
 * {
 *   success: boolean
 *   message: string
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const stripe = getStripeServerClient()
    
    // Get user ID from query params or auth header
    const searchParams = request.nextUrl.searchParams
    let userId = searchParams.get('userId')

    // If no userId in query, try to get from auth header
    if (!userId) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (!authError && user) {
          userId = user.id
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - userId required' },
        { status: 401 }
      )
    }

    // Get all user subscriptions (user subscribing to creators)
    const { data: userSubscriptions, error: userSubsError } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'past_due', 'unpaid'])

    if (userSubsError) {
      console.error('Error fetching user subscriptions:', userSubsError)
    }

    // Cancel all user subscriptions in Stripe
    if (userSubscriptions && userSubscriptions.length > 0) {
      for (const subscription of userSubscriptions) {
        try {
          if (subscription.stripe_subscription_id) {
            await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
          }
        } catch (stripeError: any) {
          console.error('Error canceling Stripe subscription:', stripeError)
          // Continue with other subscriptions even if one fails
        }
      }
    }

    // Check if user has a creator profile and get creator subscriptions
    const { data: creatorProfile } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (creatorProfile) {
      const { data: creatorSubs } = await supabase
        .from('creator_subscriptions')
        .select('stripe_subscription_id, status')
        .eq('creator_id', creatorProfile.id)
        .in('status', ['active', 'past_due', 'unpaid'])

      // Cancel creator subscriptions in Stripe
      if (creatorSubs && creatorSubs.length > 0) {
        for (const subscription of creatorSubs) {
          try {
            if (subscription.stripe_subscription_id) {
              await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
            }
          } catch (stripeError: any) {
            console.error('Error canceling creator Stripe subscription:', stripeError)
            // Continue with other subscriptions even if one fails
          }
        }
      }
    }

    // Delete user from Supabase Auth
    // This will cascade delete all related data due to ON DELETE CASCADE
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/account/delete:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

