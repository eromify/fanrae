import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * GET /api/creators/[username]
 * Get creator profile by username (alternative route)
 * 
 * Returns:
 * {
 *   id: string
 *   username: string
 *   page_url: string
 *   display_name: string
 *   bio: string
 *   profile_image_url: string
 *   is_active: boolean
 *   link: string (full URL)
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Remove @ if present
    const cleanUsername = username.replace('@', '').toLowerCase()

    // Get creator by username
    const { data: creator, error } = await supabase
      .from('creators')
      .select('id, username, page_url, display_name, bio, profile_image_url, banner_image_url, subscription_price, instagram_url, twitter_url, is_active')
      .eq('username', cleanUsername)
      .eq('is_active', true)
      .single()

    if (error || !creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      creator: creator
    })
  } catch (error: any) {
    console.error('Error in GET /api/creators/[username]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

