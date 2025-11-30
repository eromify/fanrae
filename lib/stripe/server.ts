import Stripe from 'stripe'

// Server-side Stripe client
export const getStripeServerClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }
  
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16', // Match Stripe quickstart example
  })
}


