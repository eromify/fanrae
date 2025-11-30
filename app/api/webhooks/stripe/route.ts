import { NextRequest, NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe/server'
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
    event = Stripe.Event.constructFrom(data, stripe)
  }

  let subscription: Stripe.Subscription
  let status: string

  // Handle the event
  switch (event.type) {
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
      // Then define and call a method to handle the subscription deleted.
      // handleSubscriptionDeleted(subscription);
      break

    case 'customer.subscription.created':
      subscription = event.data.object as Stripe.Subscription
      status = subscription.status
      console.log(`Subscription status is ${status}.`)
      // Then define and call a method to handle the subscription created.
      // handleSubscriptionCreated(subscription);
      break

    case 'customer.subscription.updated':
      subscription = event.data.object as Stripe.Subscription
      status = subscription.status
      console.log(`Subscription status is ${status}.`)
      // Then define and call a method to handle the subscription update.
      // handleSubscriptionUpdated(subscription);
      break

    case 'entitlements.active_entitlement_summary.updated':
      subscription = event.data.object as Stripe.Subscription
      console.log(`Active entitlement summary updated for ${subscription.id}.`)
      // Then define and call a method to handle active entitlement summary updated
      // handleEntitlementUpdated(subscription);
      break

    // Stripe Connect events
    case 'account.updated':
      const account = event.data.object as Stripe.Account
      console.log('Connect account updated:', account.id)
      
      // TODO: Update database when creator completes onboarding
      // if (account.details_submitted) {
      //   await supabase
      //     .from('creators')
      //     .update({ stripe_connect_onboarding_complete: true })
      //     .eq('stripe_connect_account_id', account.id)
      // }
      break

    case 'transfer.created':
      const transfer = event.data.object as Stripe.Transfer
      console.log('Transfer created (creator payout):', transfer.id)
      // Creator received payout - 80% of revenue
      break

    case 'transfer.failed':
      const failedTransfer = event.data.object as Stripe.Transfer
      console.log('Transfer failed (payout failed):', failedTransfer.id)
      // Handle failed payout - notify creator
      break

    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`)
  }

  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true })
}

