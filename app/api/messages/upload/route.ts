import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * POST /api/messages/upload
 * Upload media (image/video) for a message (creators only)
 * 
 * FormData:
 * - file: File (required)
 * - userId: string (required)
 * - conversationId: string (required)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const conversationId = formData.get('conversationId') as string

    if (!file || !userId || !conversationId) {
      return NextResponse.json(
        { error: 'File, user ID, and conversation ID are required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Verify user is a creator and has access to this conversation
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Only creators can upload media' },
        { status: 403 }
      )
    }

    // Verify conversation access
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('creator_id')
      .eq('id', conversationId)
      .eq('creator_id', creator.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or unauthorized' },
        { status: 404 }
      )
    }

    // Determine media type
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Only image and video files are supported' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${conversationId}/${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('messages')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('messages')
      .getPublicUrl(fileName)

    return NextResponse.json({
      url: publicUrl,
      mediaType: isImage ? 'image' : 'video'
    })
  } catch (error: any) {
    console.error('Error uploading media:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload media' },
      { status: 500 }
    )
  }
}

