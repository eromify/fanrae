import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * GET /api/messages/[conversationId]
 * Get all messages for a conversation
 * 
 * Query params:
 * - userId: string (required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('creator_id, fan_id, creator:creators!conversations_creator_id_fkey(user_id)')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const creatorUserId = (conversation.creator as any)?.user_id
    if (conversation.fan_id !== userId && creatorUserId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ messages: messages || [] })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/messages/[conversationId]
 * Send a message
 * 
 * Body:
 * {
 *   userId: string (required)
 *   content: string (optional, required if no media)
 *   mediaUrl: string (optional, creators only)
 *   mediaType: 'image' | 'video' (optional, required if mediaUrl)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params
    const body = await request.json()
    const { userId, content, mediaUrl, mediaType } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { error: 'Message content or media is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Verify user has access to this conversation and determine sender type
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('creator_id, fan_id, creator:creators!conversations_creator_id_fkey(user_id)')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const creatorUserId = (conversation.creator as any)?.user_id
    let senderType: 'creator' | 'fan'

    if (creatorUserId === userId) {
      senderType = 'creator'
    } else if (conversation.fan_id === userId) {
      senderType = 'fan'
    } else {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Only creators can send media
    if (mediaUrl && senderType !== 'creator') {
      return NextResponse.json(
        { error: 'Only creators can send media' },
        { status: 403 }
      )
    }

    // Create message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        sender_type: senderType,
        content: content || null,
        media_url: mediaUrl || null,
        media_type: mediaType || null
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}

