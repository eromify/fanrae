'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function CreatorNewPostPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [postType, setPostType] = useState<'normal' | 'premium'>('normal')
  const [premiumPrice, setPremiumPrice] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [creatorProfile, setCreatorProfile] = useState<{
    display_name: string | null
    profile_image_url: string | null
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCreatorProfile()
  }, [])

  const fetchCreatorProfile = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const response = await fetch(`/api/creator/profile?userId=${session.user.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.creator) {
            setCreatorProfile({
              display_name: data.creator.display_name,
              profile_image_url: data.creator.profile_image_url
            })
          }
        }
      }
    } catch (err) {
      console.error('Error fetching creator profile:', err)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const isImage = selectedFile.type.startsWith('image/')
    const isVideo = selectedFile.type.startsWith('video/')
    
    if (!isImage && !isVideo) {
      setError('Please select an image or video file')
      return
    }

    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setError(`File size must be less than ${isVideo ? '50MB' : '10MB'}`)
      return
    }

    setFile(selectedFile)
    setMediaType(isImage ? 'image' : 'video')
    setError(null)

    if (isImage) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      const videoUrl = URL.createObjectURL(selectedFile)
      setPreview(videoUrl)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setPreview(null)
    setMediaType(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!file) {
      setError('Please select a file to upload')
      return
    }

    if (!caption.trim()) {
      setError('Please enter a caption')
      return
    }

    if (postType === 'premium' && (!premiumPrice || parseFloat(premiumPrice) <= 0)) {
      setError('Please enter a valid price for premium posts')
      return
    }

    setIsUploading(true)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setError('Not authenticated')
        setIsUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', session.user.id)
      formData.append('caption', caption)
      formData.append('postType', postType)
      if (postType === 'premium') {
        formData.append('price', premiumPrice)
      }

      const response = await fetch('/api/creator/post/create', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create post')
      }

      router.push('/creator/home')
    } catch (err: any) {
      console.error('Error creating post:', err)
      setError(err.message || 'Failed to create post')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="app-page">
      <h1 className="app-page-title">New Post</h1>

      <form onSubmit={handleSubmit} className="creator-new-post-wrapper">
        {/* Post Card - Looks like a real social media post */}
        <div className="creator-new-post-card">
          {/* Post Header - Profile Picture + Name */}
          <div className="creator-new-post-header">
            <div className="creator-new-post-profile-pic">
              {creatorProfile?.profile_image_url ? (
                <Image
                  src={creatorProfile.profile_image_url}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="creator-new-post-avatar"
                />
              ) : (
                <div className="creator-new-post-avatar-placeholder">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="creator-new-post-name-section">
              <span className="creator-new-post-name">
                {creatorProfile?.display_name || 'Your Name'}
              </span>
              {postType === 'premium' && (
                <span className="creator-new-post-premium-tag">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                  Premium
                </span>
              )}
            </div>
          </div>

          {/* Description Input - Inside the post */}
          <div className="creator-new-post-caption-area">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="creator-new-post-caption-textarea"
              rows={3}
              maxLength={2000}
            />
            <div className="creator-new-post-char-count">
              {caption.length} / 2000
            </div>
          </div>

          {/* Media Upload Area - Inside the post */}
          <div className="creator-new-post-media-area">
            {preview ? (
              <div className="creator-new-post-media-preview-wrapper">
                {mediaType === 'image' ? (
                  <Image
                    src={preview}
                    alt="Preview"
                    width={600}
                    height={600}
                    className="creator-new-post-media-preview"
                  />
                ) : (
                  <video
                    src={preview}
                    controls
                    className="creator-new-post-media-preview"
                  />
                )}
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="creator-new-post-remove-media"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className="creator-new-post-upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="creator-new-post-file-input"
                />
                <div className="creator-new-post-upload-content">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p>Upload photo or video</p>
                </div>
              </div>
            )}
          </div>

          {/* Settings Section - Below the post card */}
          <div className="creator-new-post-settings">
            <div className="creator-new-post-type-toggle">
              <button
                type="button"
                onClick={() => setPostType('normal')}
                className={`creator-new-post-type-btn ${postType === 'normal' ? 'active' : ''}`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setPostType('premium')}
                className={`creator-new-post-type-btn ${postType === 'premium' ? 'active' : ''}`}
              >
                Premium
              </button>
            </div>

            {postType === 'premium' && (
              <div className="creator-new-post-price-input-wrapper">
                <span className="creator-new-post-dollar">$</span>
                <input
                  type="number"
                  value={premiumPrice}
                  onChange={(e) => setPremiumPrice(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="creator-new-post-price-input"
                />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="creator-new-post-error">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUploading || !file || !caption.trim()}
            className="creator-new-post-submit"
          >
            {isUploading ? 'Publishing...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}
