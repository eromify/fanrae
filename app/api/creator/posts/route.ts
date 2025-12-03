import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * GET /api/creator/posts
 * Get creator's own posts (for profile page)
 * 
 * Query params:
 * - userId: string (required)
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
 *   }>
 *   total: number
 *   page: number
 *   limit: number
 *   hasMore: boolean
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

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

    // Get total count of all posts (published and unpublished)
    const { count, error: countError } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creator.id)

    if (countError) {
      throw countError
    }

    // Get all posts (creator can see all their posts, published or not)
    const { data: posts, error: postsError } = await supabase
      .from('content')
      .select('id, title, description, media_url, media_type, price, is_unlocked, is_published, created_at')
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (postsError) {
      throw postsError
    }

    return NextResponse.json({
      posts: posts || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit
    })
  } catch (error: any) {
    console.error('Error in GET /api/creator/posts:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

