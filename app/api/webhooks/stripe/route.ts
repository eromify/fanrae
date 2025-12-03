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
      
      // Handle subscription checkout for user subscriptions to creators
      if (session.mode === 'subscription' && session.subscription && session.metadata?.type === 'user_subscription') {
        const subscriptionId = session.subscription as string
        const subscriptionObj = await stripe.subscriptions.retrieve(subscriptionId)
        
        if (session.metadata?.user_id && session.metadata?.creator_id) {
          const { error: subError } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: session.metadata.user_id,
              creator_id: session.metadata.creator_id,
              stripe_subscription_id: subscriptionObj.id,
              stripe_customer_id: subscriptionObj.customer as string,
              status: subscriptionObj.status,
              current_period_start: new Date(subscriptionObj.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscriptionObj.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscriptionObj.cancel_at_period_end || false,
            }, {
              onConflict: 'stripe_subscription_id'
            })
          
          if (subError) {
            console.error('Error saving user subscription:', subError)
          } else {
            console.log('User subscription created from checkout:', subscriptionObj.id)
          }
        }
      }
      
      // Handle one-time payment (content purchase - premium posts or tips)
      if (session.mode === 'payment' && session.payment_intent) {
        const paymentIntent = session.payment_intent as string
        const paymentIntentObj = await stripe.paymentIntents.retrieve(paymentIntent)
        
        // Handle tip payment
        if (paymentIntentObj.metadata?.type === 'tip' && paymentIntentObj.metadata?.tip_id) {
          const amount = paymentIntentObj.amount / 100 // Convert from cents
          const commission = parseFloat(paymentIntentObj.metadata.commission || '0')
          const creatorAmount = parseFloat(paymentIntentObj.metadata.creator_amount || '0')
          
          // Update tip status to completed
          const { error: tipError } = await supabase
            .from('tips')
            .update({
              status: 'completed',
              stripe_payment_intent_id: paymentIntent
            })
            .eq('id', paymentIntentObj.metadata.tip_id)
          
          if (tipError) {
            console.error('Error updating tip:', tipError)
          } else {
            console.log('Tip payment completed:', paymentIntentObj.metadata.tip_id)
          }
        }
        
        // Check if this is a premium post purchase
        if (paymentIntentObj.metadata?.content_id && paymentIntentObj.metadata?.user_id && paymentIntentObj.metadata?.creator_id && paymentIntentObj.metadata?.type === 'premium_post') {
          const amount = paymentIntentObj.amount / 100 // Convert from cents
          const commission = amount * 0.20 // 20% platform commission
          const creatorAmount = amount - commission // 80% to creator
          
          // Check if purchase already exists (prevent duplicates)
          const { data: existingPurchase } = await supabase
            .from('purchases')
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntent)
            .maybeSingle()
          
          if (!existingPurchase) {
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
              console.log('Premium post purchase saved:', paymentIntent)
            }
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
      
      // Update payout status if this transfer is for a payout
      if (transfer.metadata?.payout_id) {
        const { error: updateError } = await supabase
          .from('payouts')
          .update({
            stripe_transfer_id: transfer.id,
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', transfer.metadata.payout_id)
        
        if (updateError) {
          console.error('Error updating payout:', updateError)
        } else {
          console.log('Payout updated with transfer ID:', transfer.id)
        }
      }
      break

    case 'transfer.paid':
      const transferPaid = event.data.object as Stripe.Transfer
      console.log('Transfer paid (creator payout):', transferPaid.id)
      
      // Mark payout as paid
      if (transferPaid.metadata?.payout_id) {
        const { error: updateError } = await supabase
          .from('payouts')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', transferPaid.metadata.payout_id)
        
        if (updateError) {
          console.error('Error updating payout to paid:', updateError)
        } else {
          console.log('Payout marked as paid:', transferPaid.id)
        }
      }
      break

    case 'transfer.failed':
      const transferFailed = event.data.object as Stripe.Transfer
      console.log('Transfer failed (creator payout):', transferFailed.id)
      
      // Mark payout as failed
      if (transferFailed.metadata?.payout_id) {
        const { error: updateError } = await supabase
          .from('payouts')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', transferFailed.metadata.payout_id)
        
        if (updateError) {
          console.error('Error updating payout to failed:', updateError)
        } else {
          console.log('Payout marked as failed:', transferFailed.id)
        }
      }
      break

    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice
      console.log('Invoice payment succeeded:', invoice.id)
      
      // Track subscription payments for user subscriptions to creators
      if (invoice.subscription && (invoice.billing_reason === 'subscription_create' || invoice.billing_reason === 'subscription_cycle')) {
        // Get the subscription
        const subscriptionObj = await stripe.subscriptions.retrieve(invoice.subscription as string)
        
        // Find the user_subscription record
        const { data: userSubscription } = await supabase
          .from('user_subscriptions')
          .select('id, creator_id, user_id')
          .eq('stripe_subscription_id', subscriptionObj.id)
          .maybeSingle()
        
        if (userSubscription) {
          // Calculate amounts (invoice.amount_paid is in cents)
          const totalAmount = invoice.amount_paid / 100
          const commission = totalAmount * 0.20 // 20% platform commission
          const creatorAmount = totalAmount - commission // 80% to creator
          
          // Check if this payment already exists
          const { data: existingPayment } = await supabase
            .from('subscription_payments')
            .select('id')
            .eq('stripe_invoice_id', invoice.id)
            .maybeSingle()
          
          if (!existingPayment) {
            // Insert subscription payment record
            const { error: paymentError } = await supabase
              .from('subscription_payments')
              .insert({
                user_subscription_id: userSubscription.id,
                creator_id: userSubscription.creator_id,
                user_id: userSubscription.user_id,
                amount: totalAmount,
                commission: commission,
                creator_amount: creatorAmount,
                stripe_invoice_id: invoice.id,
                stripe_payment_intent_id: invoice.payment_intent as string || null,
                status: 'completed',
                period_start: new Date(invoice.period_start * 1000).toISOString(),
                period_end: new Date(invoice.period_end * 1000).toISOString(),
              })
            
            if (paymentError) {
              console.error('Error saving subscription payment:', paymentError)
            } else {
              console.log('Subscription payment recorded:', invoice.id)
            }
          }
        } else {
          console.log('User subscription not found for invoice:', invoice.id)
        }
      }
      break

    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`)
  }

  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true })
}

