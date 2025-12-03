import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * GET /api/discover/search?q=<search_query>
 * Search for creators by username or display name
 * 
 * Query params:
 * - q: string (required) - search query
 * - limit: number (optional, default: 50)
 * - offset: number (optional, default: 0)
 * 
 * Returns:
 * {
 *   creators: [
 *     {
 *       id: string
 *       username: string
 *       display_name: string
 *       profile_image_url: string
 *       bio: string
 *       is_active: boolean
 *     }
 *   ],
 *   total: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get search query from params
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (!query || query.trim() === '') {
      return NextResponse.json({
        creators: [],
        total: 0,
      })
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Clean and prepare search query
    const searchTerm = query.trim().toLowerCase()

    // Search creators by username or display_name using ILIKE for case-insensitive partial matching
    // This will match partial strings like "corinna" matching "corinna kopf" or "12" matching "123"
    const { data: creators, error: creatorsError } = await supabase
      .from('creators')
      .select('id, username, display_name, profile_image_url, bio, is_active')
      .eq('is_active', true)
      .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
      .order('username', { ascending: true })
      .range(offset, offset + limit - 1)

    if (creatorsError) {
      console.error('Error searching creators:', creatorsError)
      return NextResponse.json(
        { error: 'Failed to search creators' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('creators')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)

    if (countError) {
      console.error('Error counting creators:', countError)
      // Continue without count if there's an error
    }

    return NextResponse.json({
      creators: creators || [],
      total: count || creators?.length || 0,
    })
  } catch (error: any) {
    console.error('Error in GET /api/discover/search:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

