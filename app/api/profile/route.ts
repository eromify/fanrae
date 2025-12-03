import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * GET /api/profile?userId=<user_id>
 * Get user profile data including following list
 * 
 * Query params:
 * - userId: string (required)
 * 
 * Returns:
 * {
 *   profile: {
 *     id: string
 *     username: string
 *     full_name: string
 *     email: string
 *     avatar_url: string
 *     user_type: 'fan' | 'creator'
 *   },
 *   following: [
 *     {
 *       creator_id: string
 *       creator: {
 *         id: string
 *         username: string
 *         display_name: string
 *         profile_image_url: string
 *       }
 *     }
 *   ],
 *   followingCount: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get user ID from query params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, email, avatar_url, user_type')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get following list (active subscriptions)
    const { data: following, error: followingError } = await supabase
      .from('user_subscriptions')
      .select(`
        creator_id,
        creators!inner(
          id,
          username,
          display_name,
          profile_image_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')

    if (followingError) {
      console.error('Error fetching following:', followingError)
      // Continue without following if there's an error
    }

    // Transform following data
    const followingList = following?.map((item: any) => ({
      creator_id: item.creator_id,
      creator: {
        id: item.creators.id,
        username: item.creators.username,
        display_name: item.creators.display_name,
        profile_image_url: item.creators.profile_image_url,
      },
    })) || []

    // Get liked posts
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select(`
        id,
        content_id,
        created_at,
        content!inner(
          id,
          creator_id,
          title,
          description,
          media_url,
          media_type,
          is_unlocked,
          is_published,
          created_at,
          creators!inner(
            id,
            username,
            display_name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (likesError) {
      console.error('Error fetching likes:', likesError)
      // Continue without likes if there's an error
    }

    // Transform liked posts data
    const likedPosts = likes?.map((like: any) => ({
      like_id: like.id,
      content_id: like.content_id,
      liked_at: like.created_at,
      post: {
        id: like.content.id,
        creator_id: like.content.creator_id,
        title: like.content.title,
        description: like.content.description,
        media_url: like.content.media_url,
        media_type: like.content.media_type,
        is_unlocked: like.content.is_unlocked,
        is_published: like.content.is_published,
        created_at: like.content.created_at,
        creator: {
          id: like.content.creators.id,
          username: like.content.creators.username,
          display_name: like.content.creators.display_name,
        },
      },
    })) || []

    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        user_type: profile.user_type,
      },
      following: followingList,
      followingCount: followingList.length,
      likes: likedPosts,
      likesCount: likedPosts.length,
    })
  } catch (error: any) {
    console.error('Error in GET /api/profile:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

