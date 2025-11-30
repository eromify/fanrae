import { getStripeServerClient } from './server'

/**
 * Handle creator subscriptions (monthly fee creators pay to use the platform)
 */

/**
 * Create a subscription for a creator to pay monthly platform fee
 */
export async function createCreatorSubscription(
  creatorId: string,
  customerId: string,
  priceId: string, // Stripe Price ID for creator subscription
  metadata?: Record<string, string>
) {
  const stripe = getStripeServerClient()
  
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    metadata: {
      creator_id: creatorId,
      type: 'creator_subscription',
      ...metadata,
    },
  })
  
  return subscription
}

/**
 * Cancel a creator's subscription
 */
export async function cancelCreatorSubscription(subscriptionId: string) {
  const stripe = getStripeServerClient()
  
  const subscription = await stripe.subscriptions.cancel(subscriptionId)
  
  return subscription
}


