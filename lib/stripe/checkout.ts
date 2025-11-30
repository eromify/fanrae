import { getStripeServerClient } from './server'

/**
 * Create a Checkout Session for user subscribing to creator
 * This uses Stripe Checkout with Connect for automatic revenue splits
 */

export interface CreateCheckoutSessionParams {
  priceId: string // Stripe Price ID for the creator's subscription
  creatorConnectAccountId: string // Creator's Stripe Connect account ID
  customerId?: string // Optional: existing Stripe customer ID
  userId: string // Your user ID from database
  creatorId: string // Creator ID from database
  successUrl: string // URL to redirect after successful payment
  cancelUrl: string // URL to redirect if user cancels
  metadata?: Record<string, string>
}

/**
 * Create a Checkout Session with Connect revenue split
 * 80% goes to creator, 20% goes to platform
 */
export async function createCheckoutSession({
  priceId,
  creatorConnectAccountId,
  customerId,
  userId,
  creatorId,
  successUrl,
  cancelUrl,
  metadata = {},
}: CreateCheckoutSessionParams) {
  const stripe = getStripeServerClient()
  
  // Get the price to calculate commission
  const price = await stripe.prices.retrieve(priceId)
  const amount = price.unit_amount || 0
  const platformCommission = Math.round(amount * 0.20) // 20% commission
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription', // For recurring payments
    customer: customerId, // Optional: if user already has a Stripe customer
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    // Connect configuration for revenue split on subscriptions
    subscription_data: {
      application_fee_percent: 20, // 20% commission on each recurring payment
      transfer_data: {
        destination: creatorConnectAccountId, // Creator's Connect account
      },
      metadata: {
        user_id: userId,
        creator_id: creatorId,
        type: 'user_to_creator_subscription',
        ...metadata,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      creator_id: creatorId,
      type: 'checkout_session',
      ...metadata,
    },
  })
  
  return session
}

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
) {
  const stripe = getStripeServerClient()
  
  // Check if customer already exists (you'd store this in your database)
  // For now, we'll create a new one each time
  // In production, you should check your database first
  
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      user_id: userId,
    },
  })
  
  return customer
}

