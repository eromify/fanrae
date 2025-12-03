import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * GET /api/creator/notifications
 * Get creator's notifications
 * 
 * Query params:
 * - userId: string (required)
 * - limit: number (optional, default: 50)
 * 
 * Returns:
 * {
 *   notifications: Array<{
 *     id: string
 *     type: 'like' | 'subscribe' | 'message'
 *     is_read: boolean
 *     created_at: string
 *     user: {
 *       id: string
 *       username: string
 *       display_name: string | null
 *       profile_image_url: string | null
 *     }
 *     content?: {
 *       id: string
 *       title: string
 *       media_url: string
 *       media_type: 'image' | 'video'
 *     }
 *   }>
 *   unreadCount: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

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

    // Get notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        is_read,
        created_at,
        content_id,
        user_id
      `)
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (notificationsError) {
      throw notificationsError
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creator.id)
      .eq('is_read', false)

    // Fetch user profiles and content for each notification
    const notificationsWithDetails = await Promise.all(
      (notifications || []).map(async (notification) => {
        // Get user profile
        let user = null
        if (notification.user_id) {
          // Get profile (for fans, username is in profiles table)
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .eq('id', notification.user_id)
            .single()

          if (profile) {
            // Check if user is a creator (to get display_name and profile_image_url)
            const { data: creatorProfile } = await supabase
              .from('creators')
              .select('display_name, profile_image_url')
              .eq('user_id', notification.user_id)
              .maybeSingle()

            user = {
              id: profile.id,
              username: profile.username || 'unknown',
              display_name: creatorProfile?.display_name || profile.full_name || null,
              profile_image_url: creatorProfile?.profile_image_url || null
            }
          }
        }

        // Get content if it's a like notification
        let content = null
        if (notification.type === 'like' && notification.content_id) {
          const { data: contentData } = await supabase
            .from('content')
            .select('id, title, media_url, media_type')
            .eq('id', notification.content_id)
            .single()

          if (contentData) {
            content = {
              id: contentData.id,
              title: contentData.title,
              media_url: contentData.media_url,
              media_type: contentData.media_type
            }
          }
        }

        return {
          id: notification.id,
          type: notification.type,
          is_read: notification.is_read,
          created_at: notification.created_at,
          user,
          content
        }
      })
    )

    return NextResponse.json({
      notifications: notificationsWithDetails,
      unreadCount: unreadCount || 0
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/creator/notifications
 * Mark notification(s) as read
 * 
 * Body:
 * {
 *   userId: string (required)
 *   notificationId?: string (optional, if not provided, marks all as read)
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, notificationId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

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

    // Update notification(s)
    const updateQuery = supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('creator_id', creator.id)
      .eq('is_read', false)

    if (notificationId) {
      updateQuery.eq('id', notificationId)
    }

    const { error: updateError } = await updateQuery

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update notifications' },
      { status: 500 }
    )
  }
}

