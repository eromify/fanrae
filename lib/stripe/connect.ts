import Stripe from 'stripe'
import { getStripeServerClient } from './server'

/**
 * Stripe Connect utilities for handling creator payouts
 * 
 * This uses Stripe Connect Express accounts, which allows:
 * - Creators to receive payouts directly to their bank accounts
 * - Automatic revenue splitting (80% creator, 20% platform)
 * - Flexible payout schedules (daily, weekly, monthly)
 * - Compliance and tax handling automatically
 */

/**
 * Create a Stripe Connect Express account for a creator
 * This is the first step when a creator signs up
 */
export async function createConnectAccount(creatorId: string, email: string) {
  const stripe = getStripeServerClient()
  
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US', // Change based on your target market
    email: email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      creator_id: creatorId,
    },
  })
  
  return account
}

/**
 * Create an account link for onboarding
 * Creators will be redirected here to complete their Stripe setup
 */
export async function createAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
) {
  const stripe = getStripeServerClient()
  
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
  
  return accountLink
}

/**
 * Create a subscription with automatic revenue split (for user subscribing to creator)
 * 80% goes to creator, 20% goes to platform on each recurring payment
 */
export async function createSubscriptionWithSplit(
  priceId: string, // Stripe Price ID for the creator's subscription
  creatorConnectAccountId: string,
  customerId: string,
  userId: string,
  creatorId: string,
  metadata?: Record<string, string>
) {
  const stripe = getStripeServerClient()
  
  // Get the price to calculate commission
  const price = await stripe.prices.retrieve(priceId)
  const amount = price.unit_amount || 0
  const platformCommission = Math.round(amount * 0.20) // 20% commission
  
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    application_fee_percent: 20, // 20% commission on each payment
    transfer_data: {
      destination: creatorConnectAccountId, // Creator's Connect account
    },
    metadata: {
      user_id: userId,
      creator_id: creatorId,
      type: 'user_to_creator_subscription',
      platform_commission: platformCommission.toString(),
      ...metadata,
    },
  })
  
  return subscription
}

/**
 * Create a payment intent with automatic revenue split (for one-time purchases)
 * 80% goes to creator, 20% goes to platform
 */
export async function createPaymentWithSplit(
  amount: number, // Amount in cents
  creatorConnectAccountId: string,
  customerId: string,
  contentId: string,
  metadata?: Record<string, string>
) {
  const stripe = getStripeServerClient()
  const platformCommission = Math.round(amount * 0.20) // 20% commission
  const creatorAmount = amount - platformCommission // 80% to creator
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    customer: customerId,
    application_fee_amount: platformCommission, // Your 20% commission
    transfer_data: {
      destination: creatorConnectAccountId, // Creator's Connect account
    },
    metadata: {
      content_id: contentId,
      creator_amount: creatorAmount.toString(),
      platform_commission: platformCommission.toString(),
      ...metadata,
    },
  })
  
  return paymentIntent
}

/**
 * Get creator's payout schedule and update it
 */
export async function updatePayoutSchedule(
  accountId: string,
  schedule: 'daily' | 'weekly' | 'monthly'
) {
  const stripe = getStripeServerClient()
  
  // Map schedule to Stripe's interval
  const intervalMap = {
    daily: { interval: 'daily' as const },
    weekly: { interval: 'weekly' as const },
    monthly: { interval: 'monthly' as const },
  }
  
  const account = await stripe.accounts.update(accountId, {
    settings: {
      payouts: {
        schedule: intervalMap[schedule],
      },
    },
  })
  
  return account
}

/**
 * Get account status to check if onboarding is complete
 */
export async function getAccountStatus(accountId: string) {
  const stripe = getStripeServerClient()
  
  const account = await stripe.accounts.retrieve(accountId)
  
  return {
    id: account.id,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    email: account.email,
  }
}

/**
 * Create a login link for creators to access their Stripe dashboard
 */
export async function createLoginLink(accountId: string) {
  const stripe = getStripeServerClient()
  
  const loginLink = await stripe.accounts.createLoginLink(accountId)
  
  return loginLink
}

