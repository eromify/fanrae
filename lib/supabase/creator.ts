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

