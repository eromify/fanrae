import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'

/**
 * POST /api/creator/post/create
 * Create a new post (normal or premium)
 * 
 * Form data:
 * - file: File (required)
 * - userId: string (required)
 * - caption: string (required)
 * - postType: 'normal' | 'premium' (required)
 * - price: string (required if postType is 'premium')
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const caption = formData.get('caption') as string
    const postType = formData.get('postType') as 'normal' | 'premium'
    const price = formData.get('price') as string

    // Validation
    if (!file || !userId || !caption || !postType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'File must be an image or video' },
        { status: 400 }
      )
    }

    // Validate file size
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be less than ${isVideo ? '50MB' : '10MB'}` },
        { status: 400 }
      )
    }

    // Validate premium post
    if (postType === 'premium') {
      if (!price || parseFloat(price) <= 0) {
        return NextResponse.json(
          { error: 'Premium posts require a valid price' },
          { status: 400 }
        )
      }
    }

    // Get creator ID
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Creator profile not found' },
        { status: 404 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `post_${creator.id}_${timestamp}.${fileExt}`
    const filePath = `creators/${creator.id}/posts/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('creator-assets')
      .upload(filePath, file, {
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
      .from('creator-assets')
      .getPublicUrl(filePath)

    // Determine post settings
    const isUnlocked = postType === 'premium' // Premium posts require payment
    const postPrice = postType === 'premium' ? parseFloat(price) : 0
    const isPublished = true // Posts are published immediately

    // Create post in database
    const { data: post, error: postError } = await supabase
      .from('content')
      .insert({
        creator_id: creator.id,
        title: caption.substring(0, 100) || 'Untitled Post', // Use first 100 chars as title
        description: caption,
        price: postPrice,
        media_url: publicUrl,
        media_type: isImage ? 'image' : 'video',
        is_unlocked: isUnlocked,
        is_published: isPublished
      })
      .select()
      .single()

    if (postError) {
      // Try to delete uploaded file if post creation fails
      await supabase.storage
        .from('creator-assets')
        .remove([filePath])
      
      console.error('Post creation error:', postError)
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      post: {
        id: post.id,
        media_url: publicUrl,
        postType,
        price: postPrice
      }
    })
  } catch (error: any) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create post' },
      { status: 500 }
    )
  }
}

