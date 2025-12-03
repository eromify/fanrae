'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
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
  is_active: boolean
}

interface Post {
  id: string
  title: string
  description: string | null
  media_url: string
  media_type: 'image' | 'video'
  price: number
  is_unlocked: boolean
  is_published: boolean
  created_at: string
  canView?: boolean
  shouldBlur?: boolean
  creator: {
    id: string
    username: string
    display_name: string | null
    profile_image_url: string | null
  }
}

export default function PublicCreatorProfilePage() {
  const params = useParams()
  const username = params?.username as string
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [purchasingPostId, setPurchasingPostId] = useState<string | null>(null)
  const [isOpeningMessage, setIsOpeningMessage] = useState(false)

  useEffect(() => {
    checkAuth()
    if (username) {
      fetchCreatorProfile(username)
      fetchPosts(username, 1)
    }

    // Check for subscription or purchase success in URL
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('subscription') === 'success' || urlParams.get('purchased')) {
      // Refresh subscription status and posts after successful payment
      setTimeout(() => {
        if (userId && profile) {
          checkSubscription()
          fetchPosts(username, 1) // Refresh posts to show unblurred
        }
      }, 2000) // Wait 2 seconds for webhook to process
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  useEffect(() => {
    if (userId && profile) {
      checkSubscription()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile])

  const checkAuth = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setIsAuthenticated(true)
        setUserId(session.user.id)
      } else {
        setIsAuthenticated(false)
        setUserId(null)
      }
    } catch (err) {
      console.error('Error checking auth:', err)
    }
  }

  const checkSubscription = async () => {
    if (!userId || !profile) return

    try {
      const supabase = createSupabaseClient()
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('id, status')
        .eq('user_id', userId)
        .eq('creator_id', profile.id)
        .eq('status', 'active')
        .single()

      setHasSubscription(!!subscription)
    } catch (err) {
      console.error('Error checking subscription:', err)
      setHasSubscription(false)
    }
  }

  useEffect(() => {
    // Infinite scroll handler
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        if (hasMore && !isLoadingPosts && username) {
          const nextPage = currentPage + 1
          setCurrentPage(nextPage)
          fetchPosts(username, nextPage)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoadingPosts, currentPage, username])

  const fetchCreatorProfile = async (creatorUsername: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/creators/${encodeURIComponent(creatorUsername)}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Creator not found')
        } else {
          throw new Error('Failed to fetch creator profile')
        }
        return
      }

      const data = await response.json()
      if (data.creator) {
        setProfile(data.creator)
      } else {
        setError('Creator not found')
      }
    } catch (err: any) {
      console.error('Error fetching creator profile:', err)
      setError(err.message || 'Failed to load creator profile')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPosts = async (creatorUsername: string, page: number) => {
    try {
      setIsLoadingPosts(true)

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })

      // Add userId if authenticated to check subscription status
      if (userId) {
        queryParams.append('userId', userId)
      }

      const response = await fetch(
        `/api/creators/${encodeURIComponent(creatorUsername)}/posts?${queryParams.toString()}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }

      const data = await response.json()

      if (page === 1) {
        setPosts(data.posts)
      } else {
        setPosts((prev) => [...prev, ...data.posts])
      }

      setHasMore(data.hasMore)
      
      // Update subscription status if provided
      if (data.hasSubscription !== undefined) {
        setHasSubscription(data.hasSubscription)
      }
    } catch (err: any) {
      console.error('Error fetching posts:', err)
    } finally {
      setIsLoadingPosts(false)
    }
  }

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      // Redirect to signup if not authenticated
      window.location.href = `/signup?redirect=${encodeURIComponent(`/${username}`)}`
      return
    }

    if (!profile || !userId) return

    setIsSubscribing(true)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        window.location.href = `/signup?redirect=${encodeURIComponent(`/${username}`)}`
        return
      }

      const response = await fetch(`/api/creator/${encodeURIComponent(username)}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          userEmail: session.user.email,
        }),
      })

      const data = await response.json()

      if (data.requiresAuth) {
        window.location.href = `/signup?redirect=${encodeURIComponent(`/${username}`)}`
        return
      }

      if (data.error) {
        alert(data.error)
        return
      }

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      }
    } catch (err: any) {
      console.error('Error subscribing:', err)
      alert('Failed to start subscription. Please try again.')
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleMessage = async () => {
    if (!isAuthenticated || !userId) {
      // Redirect to signup if not authenticated
      window.location.href = `/signup?redirect=${encodeURIComponent(`/${username}`)}`
      return
    }

    if (!profile) return

    setIsOpeningMessage(true)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        window.location.href = `/signup?redirect=${encodeURIComponent(`/${username}`)}`
        return
      }

      // Check if user is a fan (not a creator)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single()

      if (profileData?.user_type !== 'fan') {
        // If creator, redirect to creator messages (they can message other creators)
        // For now, just redirect to messages page
        window.location.href = `/creator/messages`
        return
      }

      // Create or get conversation
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: profile.id,
          fanId: session.user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const data = await response.json()
      const conversationId = data.conversation?.id

      if (!conversationId) {
        throw new Error('Failed to get conversation ID')
      }

      // Redirect to fan messages with conversation open
      window.location.href = `/fan/messages?conversationId=${conversationId}`
    } catch (err: any) {
      console.error('Error opening message:', err)
      alert('Failed to open message. Please try again.')
      setIsOpeningMessage(false)
    }
  }

  const handlePurchasePost = async (postId: string, price: number) => {
    if (!isAuthenticated) {
      // Redirect to signup if not authenticated
      window.location.href = `/signup?redirect=${encodeURIComponent(`/${username}`)}`
      return
    }

    if (!userId) return

    setPurchasingPostId(postId)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        window.location.href = `/signup?redirect=${encodeURIComponent(`/${username}`)}`
        return
      }

      const response = await fetch(`/api/content/${postId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          userEmail: session.user.email,
        }),
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
        return
      }

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      }
    } catch (err: any) {
      console.error('Error purchasing post:', err)
      alert('Failed to start purchase. Please try again.')
    } finally {
      setPurchasingPostId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="landing-page">
        <Navbar />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          color: '#ffffff'
        }}>
          Loading...
        </div>
      </div>
    )
  }

  if (error || !profile || !profile.is_active) {
    return (
      <div className="landing-page">
        <Navbar />
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          color: '#ffffff',
          gap: '16px'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Creator Not Found</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {error || 'This creator profile does not exist or is not active.'}
          </p>
          <Link 
            href="/" 
            style={{ 
              color: 'rgba(59, 130, 246, 1)',
              textDecoration: 'none',
              marginTop: '8px'
            }}
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="landing-page">
      <Navbar />
      <div className="public-creator-profile-container">
        {/* Banner */}
        <div className="public-creator-profile-banner">
          {profile.banner_image_url ? (
            <Image
              src={profile.banner_image_url}
              alt="Banner"
              width={1200}
              height={300}
              className="public-creator-profile-banner-image"
            />
          ) : (
            <div className="public-creator-profile-banner-placeholder" />
          )}
        </div>

        {/* Profile Info */}
        <div className="public-creator-profile-info">
          <div className="public-creator-profile-picture-wrapper">
            {profile.profile_image_url ? (
              <Image
                src={profile.profile_image_url}
                alt={profile.display_name || profile.username}
                width={120}
                height={120}
                className="public-creator-profile-picture"
              />
            ) : (
              <div className="public-creator-profile-picture-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>

          {/* Username */}
          <div className="public-creator-profile-field">
            <span className="public-creator-profile-label">@</span>
            <span className="public-creator-profile-value">{profile.username}</span>
          </div>

          {/* Display Name */}
          {profile.display_name && (
            <div className="public-creator-profile-field">
              <span className="public-creator-profile-value-large">{profile.display_name}</span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="public-creator-profile-field">
              <p className="public-creator-profile-bio">{profile.bio}</p>
            </div>
          )}

          {/* Social Media */}
          <div className="public-creator-profile-social">
            {(profile.instagram_url || profile.twitter_url) && (
              <>
                {profile.instagram_url && (
                  <a
                    href={profile.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="public-creator-profile-social-link"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span>Instagram</span>
                  </a>
                )}
                {profile.twitter_url && (
                  <a
                    href={profile.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="public-creator-profile-social-link"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>X (Twitter)</span>
                  </a>
                )}
              </>
            )}
            <button
              className="public-creator-profile-message-btn"
              onClick={handleMessage}
              disabled={isOpeningMessage}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Message</span>
            </button>
          </div>

          {/* Subscription Price */}
          {profile.subscription_price && (
            <div className="public-creator-profile-subscription">
              <div className="public-creator-profile-subscription-info">
                <span className="public-creator-profile-subscription-label">Subscription Price:</span>
                <span className="public-creator-profile-subscription-price">
                  ${profile.subscription_price.toFixed(2)}/month
                </span>
              </div>
              <button 
                className="public-creator-profile-subscribe-btn"
                onClick={handleSubscribe}
                disabled={isSubscribing || hasSubscription}
              >
                {isSubscribing 
                  ? 'Processing...' 
                  : hasSubscription 
                    ? 'Subscribed' 
                    : 'Subscribe'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Posts Feed */}
      <div className="public-creator-posts-container">
        <h2 className="public-creator-posts-title">Posts</h2>
        {posts.length > 0 ? (
          <div className="public-creator-posts-grid">
            {posts.map((post) => (
              <div key={post.id} className="public-creator-post-card">
                {/* Post Header */}
                <div className="public-creator-post-header">
                  {post.creator.profile_image_url ? (
                    <Image
                      src={post.creator.profile_image_url}
                      alt={post.creator.display_name || post.creator.username}
                      width={40}
                      height={40}
                      className="public-creator-post-avatar"
                    />
                  ) : (
                    <div className="public-creator-post-avatar-placeholder">
                      {(post.creator.display_name?.[0] || post.creator.username[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <div className="public-creator-post-creator-info">
                    <div className="public-creator-post-creator-name">
                      {post.creator.display_name || post.creator.username}
                    </div>
                    <div className="public-creator-post-creator-username">
                      @{post.creator.username}
                    </div>
                  </div>
                </div>

                {/* Post Media (Blurred based on subscription/payment status) */}
                <div className="public-creator-post-media-wrapper">
                  {post.media_type === 'image' ? (
                    <div className={post.canView ? 'public-creator-post-media-unblurred' : 'public-creator-post-media-blurred'}>
                      <Image
                        src={post.media_url}
                        alt={post.title}
                        width={600}
                        height={600}
                        className={post.canView ? 'public-creator-post-image-unblurred' : 'public-creator-post-image'}
                      />
                      {post.shouldBlur && (
                        <div className="public-creator-post-blur-overlay">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>
                            {post.is_unlocked 
                              ? `$${post.price.toFixed(2)} to unlock` 
                              : 'Subscribe to view'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={post.canView ? 'public-creator-post-media-unblurred' : 'public-creator-post-media-blurred'}>
                      <video
                        src={post.media_url}
                        className={post.canView ? 'public-creator-post-video-unblurred' : 'public-creator-post-video'}
                        muted
                        playsInline
                        preload="metadata"
                        controls={post.canView}
                      />
                      {post.shouldBlur && (
                        <div className="public-creator-post-blur-overlay">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>
                            {post.is_unlocked 
                              ? `$${post.price.toFixed(2)} to unlock` 
                              : 'Subscribe to view'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Post Description */}
                <div className="public-creator-post-content">
                  <h3 className="public-creator-post-title">{post.title}</h3>
                  {post.description && (
                    <p className="public-creator-post-description">{post.description}</p>
                  )}
                  {/* Purchase Button for Premium Posts */}
                  {post.is_unlocked && post.shouldBlur && (
                    <button
                      onClick={() => handlePurchasePost(post.id, post.price)}
                      disabled={purchasingPostId === post.id}
                      className="public-creator-post-purchase-btn"
                    >
                      {purchasingPostId === post.id ? 'Processing...' : `Unlock for $${post.price.toFixed(2)}`}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isLoadingPosts && (
            <div className="public-creator-posts-empty">
              <p>No posts yet</p>
            </div>
          )
        )}

        {isLoadingPosts && (
          <div className="public-creator-posts-loading">
            <p>Loading more posts...</p>
          </div>
        )}
      </div>
    </div>
  )
}

