import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * POST /api/creators
 * Creates a new creator profile
 * 
 * Body:
 * {
 *   username: string (unique username)
 *   display_name?: string
 *   bio?: string
 * }
 * 
 * Returns:
 * {
 *   id: string
 *   username: string
 *   page_url: string (e.g., "fanrae.com/@username")
 *   link: string (full URL)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, display_name, bio, user_id } = body

    // Validate required fields
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Check if username already exists
    const { data: existingCreator } = await supabase
      .from('creators')
      .select('username')
      .eq('username', username.toLowerCase())
      .single()

    if (existingCreator) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      )
    }

    // Check if user already has a creator profile
    const { data: existingProfile } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'User already has a creator profile' },
        { status: 409 }
      )
    }

    // Generate page_url (format: @username)
    const pageUrl = `@${username.toLowerCase()}`

    // Create creator profile
    const { data: creator, error: createError } = await supabase
      .from('creators')
      .insert({
        user_id,
        username: username.toLowerCase(),
        page_url: pageUrl,
        display_name: display_name || username,
        bio: bio || null,
        is_active: true,
        subscription_status: 'inactive', // They'll need to subscribe to platform
        stripe_connect_onboarding_complete: false,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating creator:', createError)
      return NextResponse.json(
        { error: createError.message || 'Failed to create creator profile' },
        { status: 500 }
      )
    }

    // Generate full link
    const fullLink = `${baseUrl}/${creator.page_url}`

    return NextResponse.json({
      id: creator.id,
      username: creator.username,
      page_url: creator.page_url,
      link: fullLink,
      message: 'Creator profile created successfully',
    })
  } catch (error: any) {
    console.error('Error in POST /api/creators:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/creators?username=xxx
 * Get creator profile by username
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
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Get creator by username
    const { data: creator, error } = await supabase
      .from('creators')
      .select('id, username, page_url, display_name, bio, profile_image_url, is_active')
      .eq('username', username.toLowerCase())
      .eq('is_active', true)
      .single()

    if (error || !creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Generate full link
    const fullLink = `${baseUrl}/${creator.page_url}`

    return NextResponse.json({
      ...creator,
      link: fullLink,
    })
  } catch (error: any) {
    console.error('Error in GET /api/creators:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

