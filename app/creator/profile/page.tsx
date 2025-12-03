'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { createSupabaseClient } from '@/lib/supabase/client'

interface CreatorProfile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  profile_image_url: string | null
  banner_image_url: string | null
  subscription_price: number | null
  instagram_url: string | null
  twitter_url: string | null
  page_url: string
}

export default function CreatorProfilePage() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState<{
    username?: boolean
    displayName?: boolean
    bio?: boolean
    subscriptionPrice?: boolean
    instagram?: boolean
    twitter?: boolean
  }>({})
  const [editValues, setEditValues] = useState<{
    username?: string
    displayName?: string
    bio?: string
    subscriptionPrice?: string
    instagram?: string
    twitter?: string
  }>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<'profile' | 'banner' | null>(null)

  useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProfile = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      const response = await fetch(`/api/creator/profile?userId=${session.user.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      if (data.creator) {
        setProfile(data.creator)
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err)
      setError(err.message || 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (field: string, currentValue: any) => {
    setIsEditing({ ...isEditing, [field]: true })
    setEditValues({ ...editValues, [field]: currentValue || '' })
  }

  const handleCancelEdit = (field: string) => {
    setIsEditing({ ...isEditing, [field]: false })
    setEditValues({ ...editValues, [field]: undefined })
  }

  const handleSave = async (field: string) => {
    setIsSaving(true)
    setError(null)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        throw new Error('Not authenticated')
      }

      const updates: any = {}
      
      if (field === 'username') {
        updates.username = editValues.username
      } else if (field === 'displayName') {
        updates.display_name = editValues.displayName
      } else if (field === 'bio') {
        updates.bio = editValues.bio
      } else if (field === 'subscriptionPrice') {
        const price = parseFloat(editValues.subscriptionPrice || '0')
        if (price < 3.99 || price > 100.00) {
          throw new Error('Price must be between $3.99 and $100.00')
        }
        updates.subscription_price = price
      } else if (field === 'instagram') {
        updates.instagram_url = editValues.instagram || null
      } else if (field === 'twitter') {
        updates.twitter_url = editValues.twitter || null
      }

      const response = await fetch('/api/creator/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          updates
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      const data = await response.json()
      setProfile(data.creator)
      setIsEditing({ ...isEditing, [field]: false })
      setEditValues({ ...editValues, [field]: undefined })
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'profile' | 'banner') => {
    setUploading(type)
    setError(null)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        throw new Error('Not authenticated')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', session.user.id)
      formData.append('imageType', type)

      const response = await fetch('/api/creator/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload image')
      }

      const data = await response.json()
      
      // Update profile state
      if (profile) {
        setProfile({
          ...profile,
          [data.field]: data.url
        })
      }

      // Refresh profile to get updated data
      await fetchProfile()
    } catch (err: any) {
      console.error('Error uploading image:', err)
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploading(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'banner') => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file, type)
    }
  }

  if (isLoading) {
    return (
      <div className="app-page">
        <div className="app-page-loading">Loading...</div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="app-page">
        <h1 className="app-page-title">Profile</h1>
        <p className="app-page-description">Error: {error}</p>
      </div>
    )
  }

  const profileLink = profile 
    ? `${typeof window !== 'undefined' ? window.location.origin : 'fanrae.com'}/${profile.username}`
    : ''

  return (
    <div className="app-page">
      <h1 className="app-page-title">Profile</h1>

      <div className="creator-profile-container">
        {/* Banner */}
        <div className="creator-profile-banner">
          {profile?.banner_image_url ? (
            <Image
              src={profile.banner_image_url}
              alt="Banner"
              width={1200}
              height={300}
              className="creator-profile-banner-image"
            />
          ) : (
            <div className="creator-profile-banner-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L22 16M2 20H22V4H2V20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, 'banner')}
            className="creator-profile-upload-input"
            style={{ display: 'none' }}
          />
          <button
            className="creator-profile-upload-btn"
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploading === 'banner'}
          >
            {uploading === 'banner' ? (
              'Uploading...'
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>

        {/* Profile Picture and Info */}
        <div className="creator-profile-info">
          <div className="creator-profile-picture-wrapper">
            {profile?.profile_image_url ? (
              <Image
                src={profile.profile_image_url}
                alt="Profile"
                width={120}
                height={120}
                className="creator-profile-picture"
              />
            ) : (
              <div className="creator-profile-picture-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, 'profile')}
              className="creator-profile-upload-input"
              style={{ display: 'none' }}
            />
            <button
              className="creator-profile-picture-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading === 'profile'}
            >
              {uploading === 'profile' ? (
                '...'
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>

          {/* Username */}
          <div className="creator-profile-field">
            {isEditing.username ? (
              <div className="creator-profile-edit-field">
                <input
                  type="text"
                  value={editValues.username || ''}
                  onChange={(e) => setEditValues({ ...editValues, username: e.target.value })}
                  className="creator-profile-edit-input"
                  placeholder="username"
                />
                <div className="creator-profile-edit-actions">
                  <button
                    onClick={() => handleSave('username')}
                    disabled={isSaving}
                    className="creator-profile-save-btn"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleCancelEdit('username')}
                    disabled={isSaving}
                    className="creator-profile-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="creator-profile-field-row">
                <span className="creator-profile-label">@</span>
                <span className="creator-profile-value">{profile?.username || 'Not set'}</span>
                <button
                  onClick={() => handleEdit('username', profile?.username)}
                  className="creator-profile-edit-icon"
                  aria-label="Edit username"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Display Name */}
          <div className="creator-profile-field">
            {isEditing.displayName ? (
              <div className="creator-profile-edit-field">
                <input
                  type="text"
                  value={editValues.displayName || ''}
                  onChange={(e) => setEditValues({ ...editValues, displayName: e.target.value })}
                  className="creator-profile-edit-input"
                  placeholder="Display name"
                />
                <div className="creator-profile-edit-actions">
                  <button
                    onClick={() => handleSave('displayName')}
                    disabled={isSaving}
                    className="creator-profile-save-btn"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleCancelEdit('displayName')}
                    disabled={isSaving}
                    className="creator-profile-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="creator-profile-field-row">
                <span className="creator-profile-value-large">{profile?.display_name || 'Not set'}</span>
                <button
                  onClick={() => handleEdit('displayName', profile?.display_name)}
                  className="creator-profile-edit-icon"
                  aria-label="Edit display name"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="creator-profile-field">
            {isEditing.bio ? (
              <div className="creator-profile-edit-field">
                <textarea
                  value={editValues.bio || ''}
                  onChange={(e) => setEditValues({ ...editValues, bio: e.target.value })}
                  className="creator-profile-edit-textarea"
                  placeholder="Write your bio..."
                  rows={4}
                />
                <div className="creator-profile-edit-actions">
                  <button
                    onClick={() => handleSave('bio')}
                    disabled={isSaving}
                    className="creator-profile-save-btn"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleCancelEdit('bio')}
                    disabled={isSaving}
                    className="creator-profile-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="creator-profile-field-row">
                <p className="creator-profile-bio">
                  {profile?.bio || 'No bio yet. Click to add one.'}
                </p>
                <button
                  onClick={() => handleEdit('bio', profile?.bio)}
                  className="creator-profile-edit-icon"
                  aria-label="Edit bio"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Social Media */}
          <div className="creator-profile-social">
            <div className="creator-profile-social-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              {isEditing.instagram ? (
                <div className="creator-profile-edit-field-inline">
                  <input
                    type="text"
                    value={editValues.instagram || ''}
                    onChange={(e) => setEditValues({ ...editValues, instagram: e.target.value })}
                    className="creator-profile-edit-input-small"
                    placeholder="Instagram URL"
                  />
                  <button
                    onClick={() => handleSave('instagram')}
                    disabled={isSaving}
                    className="creator-profile-save-btn-small"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleCancelEdit('instagram')}
                    disabled={isSaving}
                    className="creator-profile-cancel-btn-small"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="creator-profile-social-link">
                  {profile?.instagram_url ? (
                    <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer">
                      {profile.instagram_url}
                    </a>
                  ) : (
                    <span className="creator-profile-social-placeholder">Add Instagram</span>
                  )}
                  <button
                    onClick={() => handleEdit('instagram', profile?.instagram_url)}
                    className="creator-profile-edit-icon-small"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="creator-profile-social-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              {isEditing.twitter ? (
                <div className="creator-profile-edit-field-inline">
                  <input
                    type="text"
                    value={editValues.twitter || ''}
                    onChange={(e) => setEditValues({ ...editValues, twitter: e.target.value })}
                    className="creator-profile-edit-input-small"
                    placeholder="X (Twitter) URL"
                  />
                  <button
                    onClick={() => handleSave('twitter')}
                    disabled={isSaving}
                    className="creator-profile-save-btn-small"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleCancelEdit('twitter')}
                    disabled={isSaving}
                    className="creator-profile-cancel-btn-small"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="creator-profile-social-link">
                  {profile?.twitter_url ? (
                    <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer">
                      {profile.twitter_url}
                    </a>
                  ) : (
                    <span className="creator-profile-social-placeholder">Add X (Twitter)</span>
                  )}
                  <button
                    onClick={() => handleEdit('twitter', profile?.twitter_url)}
                    className="creator-profile-edit-icon-small"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Link (not editable) */}
          <div className="creator-profile-field">
            <div className="creator-profile-field-row">
              <span className="creator-profile-label">Link:</span>
              <span className="creator-profile-link">{profileLink || 'Not available'}</span>
            </div>
          </div>
        </div>

        {/* Subscription Price */}
        <div className="creator-profile-subscription">
          <div className="creator-profile-field">
            {isEditing.subscriptionPrice ? (
              <div className="creator-profile-edit-field">
                <div className="creator-profile-price-input-wrapper">
                  <span className="creator-profile-price-symbol">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="3.99"
                    max="100.00"
                    value={editValues.subscriptionPrice || ''}
                    onChange={(e) => setEditValues({ ...editValues, subscriptionPrice: e.target.value })}
                    className="creator-profile-edit-input"
                    placeholder="9.99"
                  />
                </div>
                <div className="creator-profile-edit-actions">
                  <button
                    onClick={() => handleSave('subscriptionPrice')}
                    disabled={isSaving}
                    className="creator-profile-save-btn"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleCancelEdit('subscriptionPrice')}
                    disabled={isSaving}
                    className="creator-profile-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="creator-profile-field-row">
                <span className="creator-profile-label">Subscription Price:</span>
                <span className="creator-profile-value">${profile?.subscription_price?.toFixed(2) || 'Not set'}</span>
                <button
                  onClick={() => handleEdit('subscriptionPrice', profile?.subscription_price?.toString())}
                  className="creator-profile-edit-icon"
                  aria-label="Edit subscription price"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="creator-profile-error">{error}</div>
        )}
      </div>
    </div>
  )
}
