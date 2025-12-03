import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * GET /api/messages/conversations
 * Get all conversations for the current user (creator or fan)
 * 
 * Query params:
 * - userId: string (required)
 * - userType: 'creator' | 'fan' (required)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const userType = searchParams.get('userType') as 'creator' | 'fan'

    if (!userId || !userType) {
      return NextResponse.json(
        { error: 'User ID and user type are required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    let conversations

    if (userType === 'creator') {
      // Get creator ID
      const { data: creator, error: creatorError } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (creatorError || !creator) {
        return NextResponse.json(
          { error: 'Creator not found' },
          { status: 404 }
        )
      }

      // Get conversations for this creator
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          creator_id,
          fan_id,
          last_message_at,
          created_at,
          fan:profiles(
            id,
            username,
            profile_image_url
          )
        `)
        .eq('creator_id', creator.id)
        .order('last_message_at', { ascending: false })

      if (error) {
        console.error('Error fetching creator conversations:', error)
        throw error
      }
      conversations = data
    } else {
      // Get conversations for this fan
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          creator_id,
          fan_id,
          last_message_at,
          created_at,
          creator:creators(
            id,
            username,
            display_name,
            profile_image_url
          )
        `)
        .eq('fan_id', userId)
        .order('last_message_at', { ascending: false })

      if (error) {
        console.error('Error fetching fan conversations:', error)
        throw error
      }
      conversations = data
    }

    return NextResponse.json({ conversations: conversations || [] })
  } catch (error: any) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/messages/conversations
 * Create a new conversation
 * 
 * Body:
 * {
 *   creatorId: string (required)
 *   fanId: string (required)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { creatorId, fanId } = body

    if (!creatorId || !fanId) {
      return NextResponse.json(
        { error: 'Creator ID and Fan ID are required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('creator_id', creatorId)
      .eq('fan_id', fanId)
      .single()

    if (existing) {
      return NextResponse.json({ conversation: existing })
    }

    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        creator_id: creatorId,
        fan_id: fanId
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ conversation })
  } catch (error: any) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    )
  }
}

