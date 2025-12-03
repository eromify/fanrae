import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * GET /api/creators/[username]/posts
 * Get creator's posts (paginated)
 * 
 * Query params:
 * - page: page number (default: 1)
 * - limit: items per page (default: 20)
 * 
 * Returns:
 * {
 *   posts: Array<{
 *     id: string
 *     title: string
 *     description: string | null
 *     media_url: string
 *     media_type: 'image' | 'video'
 *     price: number
 *     is_unlocked: boolean
 *     is_published: boolean
 *     created_at: string
 *     creator: {
 *       id: string
 *       username: string
 *       display_name: string | null
 *       profile_image_url: string | null
 *     }
 *   }>
 *   total: number
 *   page: number
 *   limit: number
 *   hasMore: boolean
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit
    const userId = searchParams.get('userId') // Optional: to check subscription status

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Remove @ if present
    const cleanUsername = username.replace('@', '').toLowerCase()

    // First, get creator ID
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id, username, display_name, profile_image_url')
      .eq('username', cleanUsername)
      .eq('is_active', true)
      .single()

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Check if user is the creator (can see all posts unblurred)
    let isCreator = false
    if (userId) {
      const { data: creatorUser } = await supabase
        .from('creators')
        .select('user_id')
        .eq('id', creator.id)
        .single()
      
      isCreator = creatorUser?.user_id === userId
    }

    // Check if user has active subscription to this creator
    let hasSubscription = false
    if (userId && !isCreator) {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('creator_id', creator.id)
        .eq('status', 'active')
        .single()

      hasSubscription = !!subscription
    }

    // Get total count of published posts
    const { count, error: countError } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creator.id)
      .eq('is_published', true)

    if (countError) {
      throw countError
    }

    // Get published posts with pagination
    const { data: posts, error: postsError } = await supabase
      .from('content')
      .select('id, title, description, media_url, media_type, price, is_unlocked, is_published, created_at')
      .eq('creator_id', creator.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (postsError) {
      throw postsError
    }

    // Check which posts user has purchased (for premium posts)
    let purchasedPostIds: string[] = []
    if (userId && !isCreator) {
      const { data: purchases } = await supabase
        .from('purchases')
        .select('content_id')
        .eq('user_id', userId)
        .eq('creator_id', creator.id)
        .eq('status', 'completed')
      
      if (purchases) {
        purchasedPostIds = purchases.map(p => p.content_id)
      }
    }

    // Add creator info and visibility status to each post
    const postsWithCreator = posts.map(post => {
      // Determine if post should be blurred
      let shouldBlur = false
      let canView = false

      if (isCreator) {
        // Creator can see all their posts unblurred
        canView = true
        shouldBlur = false
      } else if (post.is_unlocked) {
        // Premium post - only unblurred if user paid
        canView = purchasedPostIds.includes(post.id)
        shouldBlur = !canView
      } else {
        // Normal post - unblurred if user has subscription
        canView = hasSubscription
        shouldBlur = !hasSubscription
      }

      return {
        ...post,
        creator: {
          id: creator.id,
          username: creator.username,
          display_name: creator.display_name,
          profile_image_url: creator.profile_image_url
        },
        canView,
        shouldBlur
      }
    })

    return NextResponse.json({
      posts: postsWithCreator,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
      hasSubscription
    })
  } catch (error: any) {
    console.error('Error in GET /api/creators/[username]/posts:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

