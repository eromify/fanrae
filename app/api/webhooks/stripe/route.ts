import { NextRequest, NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'
import Stripe from 'stripe'

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events
 * 
 * You'll need to configure this URL in your Stripe Dashboard:
 * https://yourdomain.com/api/webhooks/stripe
 */
export async function POST(request: NextRequest) {
  const stripe = getStripeServerClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event: Stripe.Event

  // Only verify the event if you have an endpoint secret defined
  if (webhookSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message)
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }
  } else {
    // Otherwise use the basic event deserialized with JSON.parse
    const data = JSON.parse(body)
    event = data as Stripe.Event
  }

  let subscription: Stripe.Subscription
  let status: string
  const supabase = createSupabaseServerClient()

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      console.log('Checkout session completed:', session.id)
      
      // Handle subscription checkout
      if (session.mode === 'subscription' && session.subscription) {
        // Subscription is handled by customer.subscription.created event
        console.log('Subscription checkout completed:', session.subscription)
      }
      
      // Handle one-time payment (content purchase)
      if (session.mode === 'payment' && session.payment_intent) {
        const paymentIntent = session.payment_intent as string
        const paymentIntentObj = await stripe.paymentIntents.retrieve(paymentIntent)
        
        if (paymentIntentObj.metadata?.content_id && paymentIntentObj.metadata?.user_id && paymentIntentObj.metadata?.creator_id) {
          const amount = paymentIntentObj.amount / 100 // Convert from cents
          const commission = amount * 0.20 // 20% platform commission
          const creatorAmount = amount - commission // 80% to creator
          
          const { error: purchaseError } = await supabase
            .from('purchases')
            .insert({
              user_id: paymentIntentObj.metadata.user_id,
              content_id: paymentIntentObj.metadata.content_id,
              creator_id: paymentIntentObj.metadata.creator_id,
              amount: amount,
              commission: commission,
              creator_amount: creatorAmount,
              stripe_payment_intent_id: paymentIntent,
              status: 'completed',
            })
          
          if (purchaseError) {
            console.error('Error saving purchase:', purchaseError)
          } else {
            console.log('Purchase saved:', paymentIntent)
          }
        }
      }
      break

    case 'customer.subscription.trial_will_end':
      subscription = event.data.object as Stripe.Subscription
      status = subscription.status
      console.log(`Subscription status is ${status}.`)
      // Then define and call a method to handle the subscription trial ending.
      // handleSubscriptionTrialEnding(subscription);
      break

    case 'customer.subscription.deleted':
      subscription = event.data.object as Stripe.Subscription
      status = subscription.status
      console.log(`Subscription status is ${status}.`)
      
      // Update subscription status to canceled in database
      const supabaseDelete = createSupabaseServerClient()
      const { error: deleteError } = await supabaseDelete
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)
      
      if (deleteError) {
        console.error('Error updating deleted subscription:', deleteError)
      } else {
        console.log('User subscription canceled:', subscription.id)
      }
      break

    case 'customer.subscription.created':
      subscription = event.data.object as Stripe.Subscription
      status = subscription.status
      console.log(`Subscription status is ${status}.`)
      
      // Save user subscription to database
      if (subscription.metadata?.creator_id && subscription.metadata?.user_id) {
        const supabase = createSupabaseServerClient()
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: subscription.metadata.user_id,
            creator_id: subscription.metadata.creator_id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end || false,
          })
        
        if (error) {
          console.error('Error saving user subscription:', error)
        } else {
          console.log('User subscription created:', subscription.id)
        }
      }
      break

    case 'customer.subscription.updated':
      subscription = event.data.object as Stripe.Subscription
      status = subscription.status
      console.log(`Subscription status is ${status}.`)
      
      // Update user subscription in database
      const supabase = createSupabaseServerClient()
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)
      
      if (updateError) {
        console.error('Error updating user subscription:', updateError)
      } else {
        console.log('User subscription updated:', subscription.id)
      }
      break

    // Stripe Connect events
    case 'account.updated':
      const account = event.data.object as Stripe.Account
      console.log('Connect account updated:', account.id)
      
      // Update database when creator completes onboarding
      if (account.details_submitted) {
        const supabase = createSupabaseServerClient()
        const { error } = await supabase
          .from('creators')
          .update({ 
            stripe_connect_onboarding_complete: true,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_connect_account_id', account.id)
        
        if (error) {
          console.error('Error updating creator onboarding status:', error)
        } else {
          console.log('Creator onboarding completed:', account.id)
        }
      }
      break

    case 'transfer.created':
      const transfer = event.data.object as Stripe.Transfer
      console.log('Transfer created (creator payout):', transfer.id)
      // Creator received payout - 80% of revenue
      break

    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`)
  }

  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true })
}

