import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get creator profile
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (creatorError) {
      if (creatorError.code === 'PGRST116') {
        // Creator profile doesn't exist yet
        return NextResponse.json({
          creator: null,
          message: 'Creator profile not found'
        })
      }
      throw creatorError
    }

    return NextResponse.json({ creator })
  } catch (error: any) {
    console.error('Error fetching creator profile:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch creator profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const body = await request.json()
    const { userId, updates } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get creator ID
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id, username')
      .eq('user_id', userId)
      .single()

    if (creatorError) {
      return NextResponse.json(
        { error: 'Creator profile not found' },
        { status: 404 }
      )
    }

    // If username is being updated, check if it's available
    if (updates.username && updates.username !== creator.username) {
      const cleanUsername = updates.username.replace(/^@/, '').trim().toLowerCase()
      
      // Validate username format
      if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
        return NextResponse.json(
          { error: 'Username can only contain letters, numbers, and underscores' },
          { status: 400 }
        )
      }

      // Check if username is taken
      const { data: existing } = await supabase
        .from('creators')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', creator.id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'This username is already taken' },
          { status: 400 }
        )
      }

      // Update page_url based on new username
      updates.page_url = `@${cleanUsername}`
      updates.username = cleanUsername
    }

    // Update creator profile
    const { data: updatedCreator, error: updateError } = await supabase
      .from('creators')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', creator.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ creator: updatedCreator })
  } catch (error: any) {
    console.error('Error updating creator profile:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update creator profile' },
      { status: 500 }
    )
  }
}

