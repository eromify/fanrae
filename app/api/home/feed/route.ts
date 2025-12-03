import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * GET /api/home/feed
 * Get home feed posts for the authenticated fan user
 * 
 * Headers:
 * - Authorization: Bearer <access_token> (optional, can also use userId query param)
 * 
 * Query params:
 * - userId: string (required if no auth token)
 * - limit: number (optional, default: 50)
 * - offset: number (optional, default: 0)
 * 
 * Returns free (non-premium) posts from creators the user follows,
 * ordered by most recent first
 * 
 * Returns:
 * {
 *   posts: [
 *     {
 *       id: string
 *       creator_id: string
 *       title: string
 *       description: string
 *       price: number
 *       media_url: string
 *       media_type: 'image' | 'video'
 *       is_unlocked: boolean (always false for free posts)
 *       is_published: boolean (always true)
 *       created_at: string
 *       updated_at: string
 *       creator: {
 *         id: string
 *         username: string
 *         display_name: string
 *         profile_image_url: string
 *       }
 *     }
 *   ],
 *   total: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get user ID from query params or auth header
    const searchParams = request.nextUrl.searchParams
    let userId = searchParams.get('userId')

    // If no userId in query, try to get from auth header
    if (!userId) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (!authError && user) {
          userId = user.id
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - userId required' },
        { status: 401 }
      )
    }

    // Get query parameters for pagination
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Get creators the user follows (active subscriptions)
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('creator_id')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    // If user doesn't follow anyone, return empty feed
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        posts: [],
        total: 0,
      })
    }

    // Extract creator IDs
    const creatorIds = subscriptions.map(sub => sub.creator_id)

    // Get free (non-premium) published posts from followed creators
    // is_unlocked = false means it's free (not premium)
    const { data: posts, error: postsError } = await supabase
      .from('content')
      .select(`
        id,
        creator_id,
        title,
        description,
        price,
        media_url,
        media_type,
        is_unlocked,
        is_published,
        created_at,
        updated_at,
        creators!inner(
          id,
          username,
          display_name,
          profile_image_url
        )
      `)
      .in('creator_id', creatorIds)
      .eq('is_published', true)
      .eq('is_unlocked', false) // Only free posts (not premium)
      .order('created_at', { ascending: false }) // Most recent first
      .range(offset, offset + limit - 1)

    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .in('creator_id', creatorIds)
      .eq('is_published', true)
      .eq('is_unlocked', false)

    if (countError) {
      console.error('Error counting posts:', countError)
      // Continue without count if there's an error
    }

    // Transform the data to flatten creator info
    const transformedPosts = posts?.map((post: any) => ({
      id: post.id,
      creator_id: post.creator_id,
      title: post.title,
      description: post.description,
      price: post.price,
      media_url: post.media_url,
      media_type: post.media_type,
      is_unlocked: post.is_unlocked,
      is_published: post.is_published,
      created_at: post.created_at,
      updated_at: post.updated_at,
      creator: {
        id: post.creators.id,
        username: post.creators.username,
        display_name: post.creators.display_name,
        profile_image_url: post.creators.profile_image_url,
      },
    })) || []

    return NextResponse.json({
      posts: transformedPosts,
      total: count || transformedPosts.length,
    })
  } catch (error: any) {
    console.error('Error in GET /api/home/feed:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

