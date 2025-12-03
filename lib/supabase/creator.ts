import { createSupabaseClient } from './client'

export interface CreatorStatus {
  isCreator: boolean
  hasPaid: boolean
  creatorId: string | null
  creatorType: 'ai' | 'human' | null
}

/**
 * Check if a user is a creator and if they have paid for the platform subscription
 */
export async function checkCreatorStatus(
  userId: string
): Promise<CreatorStatus> {
  const supabase = createSupabaseClient()

  // Check if user has a creator profile
  const { data: creator, error: creatorError } = await supabase
    .from('creators')
    .select('id, user_id, creator_type')
    .eq('user_id', userId)
    .single()

  if (creatorError || !creator) {
    return {
      isCreator: false,
      hasPaid: false,
      creatorId: null,
      creatorType: null,
    }
  }

  // Check if creator has an active subscription
  const { data: subscription, error: subError } = await supabase
    .from('creator_subscriptions')
    .select('id, status')
    .eq('creator_id', creator.id)
    .eq('status', 'active')
    .single()

  const hasPaid = !subError && subscription !== null
  const creatorType = (creator.creator_type as 'ai' | 'human' | null) || null

  return {
    isCreator: true,
    hasPaid,
    creatorId: creator.id,
    creatorType,
  }
}

/**
 * Save creator type selection
 */
export async function saveCreatorType(
  userId: string,
  creatorType: 'ai' | 'human'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseClient()

  // First check if creator profile exists
  const { data: existingCreator } = await supabase
    .from('creators')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existingCreator) {
    // Update existing creator with type
    const { error } = await supabase
      .from('creators')
      .update({ creator_type: creatorType })
      .eq('id', existingCreator.id)

    if (error) {
      return { success: false, error: error.message }
    }
  }
  // Note: If creator profile doesn't exist yet, it will be created
  // during the payment flow after onboarding

  return { success: true }
}

/**
 * Save subscription price
 */
export async function saveSubscriptionPrice(
  userId: string,
  price: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseClient()

  // Validate price range
  if (price < 3.99 || price > 100.00) {
    return { success: false, error: 'Price must be between $3.99 and $100.00' }
  }

  // Check if creator profile exists
  const { data: existingCreator } = await supabase
    .from('creators')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existingCreator) {
    // Update existing creator with subscription price
    const { error } = await supabase
      .from('creators')
      .update({ subscription_price: price })
      .eq('id', existingCreator.id)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    // Create new creator profile with subscription price
    // Note: This should ideally not happen here as creator profile should exist by this point
    // But we'll handle it gracefully
    const { error } = await supabase
      .from('creators')
      .insert({
        user_id: userId,
        subscription_price: price,
        username: `user_${userId.substring(0, 8)}`,
        page_url: `/user_${userId.substring(0, 8)}`,
      })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  return { success: true }
}

