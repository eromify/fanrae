'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

interface Creator {
  id: string
  username: string
  display_name: string
  profile_image_url: string | null
}

interface LikedPost {
  like_id: string
  content_id: string
  liked_at: string
  post: {
    id: string
    creator_id: string
    title: string
    description: string | null
    media_url: string
    media_type: 'image' | 'video'
    is_unlocked: boolean
    is_published: boolean
    created_at: string
    creator: {
      id: string
      username: string
      display_name: string
    }
  }
}

interface ProfileData {
  profile: {
    id: string
    username: string | null
    full_name: string | null
    email: string | null
    avatar_url: string | null
    user_type: string | null
  }
  following: Array<{
    creator_id: string
    creator: Creator
  }>
  followingCount: number
  likes: LikedPost[]
  likesCount: number
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowingExpanded, setIsFollowingExpanded] = useState(false)
  const [isLikesExpanded, setIsLikesExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfileData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProfileData = async () => {
    try {
      const supabase = createSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      // Fetch profile data from API
      const response = await fetch(`/api/profile?userId=${session.user.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      setProfileData(data)
    } catch (err: any) {
      console.error('Error fetching profile:', err)
      setError(err.message || 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="app-page">
        <div className="app-page-loading">Loading...</div>
      </div>
    )
  }

  if (error || !profileData) {
    return (
      <div className="app-page">
        <h1 className="app-page-title">Profile</h1>
        <p className="app-page-description">Error loading profile: {error || 'Unknown error'}</p>
      </div>
    )
  }

  const { profile, following, followingCount, likes, likesCount } = profileData

  return (
    <div className="app-page">
      <h1 className="app-page-title">Profile</h1>
      
      <div className="profile-content">
        {/* Username */}
        <div className="profile-field">
          <label className="profile-field-label">Username</label>
          <div className="profile-field-value">
            {profile.username ? `@${profile.username}` : 'Not set'}
          </div>
        </div>

        {/* Email */}
        <div className="profile-field">
          <label className="profile-field-label">Email</label>
          <div className="profile-field-value">
            {profile.email || 'Not set'}
          </div>
        </div>

        {/* Following */}
        <div className="profile-field">
          <button
            className="profile-following-header"
            onClick={() => setIsFollowingExpanded(!isFollowingExpanded)}
            aria-expanded={isFollowingExpanded}
          >
            <label className="profile-field-label">Following</label>
            <div className="profile-following-count">
              <span>{followingCount}</span>
              <svg
                className={`profile-following-icon ${isFollowingExpanded ? 'expanded' : ''}`}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 9L12 15L18 9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>

          {/* Following List */}
          {isFollowingExpanded && following.length > 0 && (
            <div className="profile-following-list">
              {following.map((item) => (
                <div key={item.creator_id} className="profile-following-item">
                  {item.creator.profile_image_url ? (
                    <img
                      src={item.creator.profile_image_url}
                      alt={item.creator.display_name || item.creator.username}
                      className="profile-following-avatar"
                    />
                  ) : (
                    <div className="profile-following-avatar-placeholder">
                      {item.creator.display_name?.[0] || item.creator.username[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="profile-following-info">
                    <div className="profile-following-name">
                      {item.creator.display_name || item.creator.username}
                    </div>
                    <div className="profile-following-username">
                      @{item.creator.username}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isFollowingExpanded && following.length === 0 && (
            <div className="profile-following-empty">
              You're not following anyone yet
            </div>
          )}
        </div>

        {/* Likes */}
        <div className="profile-field">
          <button
            className="profile-following-header"
            onClick={() => setIsLikesExpanded(!isLikesExpanded)}
            aria-expanded={isLikesExpanded}
          >
            <label className="profile-field-label">Likes</label>
            <div className="profile-following-count">
              <span>{likesCount}</span>
              <svg
                className={`profile-following-icon ${isLikesExpanded ? 'expanded' : ''}`}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 9L12 15L18 9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>

          {/* Liked Posts Grid */}
          {isLikesExpanded && likes.length > 0 && (
            <div className="profile-likes-grid">
              {likes.map((like) => (
                <div key={like.like_id} className="profile-likes-item">
                  {like.post.media_type === 'image' ? (
                    <img
                      src={like.post.media_url}
                      alt={like.post.title}
                      className="profile-likes-media"
                    />
                  ) : (
                    <video
                      src={like.post.media_url}
                      className="profile-likes-media"
                      controls
                      muted
                    />
                  )}
                  <div className="profile-likes-overlay">
                    <div className="profile-likes-info">
                      <div className="profile-likes-title">{like.post.title}</div>
                      <div className="profile-likes-creator">
                        @{like.post.creator.username}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLikesExpanded && likes.length === 0 && (
            <div className="profile-following-empty">
              You haven't liked any posts yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
