// Database types will be generated from Supabase schema
// For now, placeholder types

export interface User {
  id: string
  email: string
  created_at: string
}

export interface Creator {
  id: string
  user_id: string
  username: string
  page_url: string
  is_active: boolean
  subscription_status: 'active' | 'inactive' | 'cancelled'
  stripe_connect_account_id: string | null // Stripe Connect account ID for payouts
  stripe_connect_onboarding_complete: boolean // Whether creator has completed Stripe onboarding
  payout_schedule: 'daily' | 'weekly' | 'monthly' // Creator's preferred payout schedule
  created_at: string
}

export interface Content {
  id: string
  creator_id: string
  title: string
  description: string
  price: number
  media_url: string
  is_unlocked: boolean
  created_at: string
}

export interface Purchase {
  id: string
  user_id: string
  content_id: string
  amount: number
  commission: number
  stripe_payment_intent_id: string
  created_at: string
}

export interface Subscription {
  id: string
  creator_id: string
  stripe_subscription_id: string
  status: 'active' | 'canceled' | 'past_due'
  current_period_end: string
  created_at: string
}


