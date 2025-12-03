'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Post {
  id: string
  creator_id: string
  title: string
  description: string | null
  price: number
  media_url: string
  media_type: 'image' | 'video'
  is_unlocked: boolean
  is_published: boolean
  created_at: string
  creator: {
    id: string
    username: string
    display_name: string | null
    profile_image_url: string | null
  }
}

export default function FanHomePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFeed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchFeed = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      const response = await fetch(`/api/home/feed?userId=${session.user.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch feed')
      }

      const data = await response.json()
      setPosts(data.posts || [])
    } catch (err: any) {
      console.error('Error fetching feed:', err)
      setError(err.message || 'Failed to load feed')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="app-page">
        <div className="app-page-loading">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-page">
        <h1 className="app-page-title">Home</h1>
        <p className="app-page-description">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="app-page">
      <h1 className="app-page-title">Home</h1>
      <p className="app-page-description">Posts from creators you follow</p>

      {posts.length > 0 ? (
        <div className="fan-home-feed">
          {posts.map((post) => (
            <div key={post.id} className="fan-home-post">
              <div className="fan-home-post-header">
                <Link href={`/${post.creator.username}`} className="fan-home-post-creator">
                  {post.creator.profile_image_url ? (
                    <Image
                      src={post.creator.profile_image_url}
                      alt={post.creator.display_name || post.creator.username}
                      width={40}
                      height={40}
                      className="fan-home-post-avatar"
                    />
                  ) : (
                    <div className="fan-home-post-avatar-placeholder">
                      {(post.creator.display_name?.[0] || post.creator.username[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <div className="fan-home-post-creator-info">
                    <div className="fan-home-post-creator-name">
                      {post.creator.display_name || post.creator.username}
                    </div>
                    <div className="fan-home-post-creator-username">
                      @{post.creator.username}
                    </div>
                  </div>
                </Link>
                <div className="fan-home-post-time">{formatTime(post.created_at)}</div>
              </div>

              <div className="fan-home-post-media">
                {post.media_type === 'image' ? (
                  <Image
                    src={post.media_url}
                    alt={post.title}
                    width={600}
                    height={600}
                    className="fan-home-post-image"
                  />
                ) : (
                  <video
                    src={post.media_url}
                    controls
                    className="fan-home-post-video"
                  />
                )}
              </div>

              <div className="fan-home-post-content">
                <h3 className="fan-home-post-title">{post.title}</h3>
                {post.description && (
                  <p className="fan-home-post-description">{post.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fan-home-empty">
          <p>No posts yet. Follow some creators to see their content here!</p>
          <Link href="/fan/discover" className="btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
            Discover Creators
          </Link>
        </div>
      )}
    </div>
  )
}
