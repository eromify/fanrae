'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createSupabaseClient } from '@/lib/supabase/client'

interface NotificationUser {
  id: string
  username: string
  display_name: string | null
  profile_image_url: string | null
}

interface NotificationContent {
  id: string
  title: string
  media_url: string
  media_type: 'image' | 'video'
}

interface Notification {
  id: string
  type: 'like' | 'subscribe' | 'message'
  is_read: boolean
  created_at: string
  user: NotificationUser | null
  content: NotificationContent | null
}

export default function CreatorNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  useEffect(() => {
    fetchNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchNotifications = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      const response = await fetch(`/api/creator/notifications?userId=${session.user.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err: any) {
      console.error('Error fetching notifications:', err)
      setError(err.message || 'Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) return

      const response = await fetch('/api/creator/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          notificationId
        })
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id)
    }

    // Show content if it's a like notification
    if (notification.type === 'like' && notification.content) {
      setSelectedNotification(notification)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const getNotificationText = (notification: Notification) => {
    if (!notification.user) return 'Unknown user'

    const username = notification.user.display_name || notification.user.username
    const atUsername = `@${notification.user.username}`

    switch (notification.type) {
      case 'like':
        return `${atUsername} liked your post`
      case 'subscribe':
        return `${atUsername} subscribed to you`
      case 'message':
        return `${atUsername} sent you a message`
      default:
        return 'New notification'
    }
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
        <h1 className="app-page-title">Notifications</h1>
        <p className="app-page-description">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="app-page">
      <h1 className="app-page-title">Notifications</h1>
      {unreadCount > 0 && (
        <p className="app-page-description">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
      )}

      <div className="creator-notifications-container">
        {/* Notifications List */}
        <div className="creator-notifications-list">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <button
                key={notification.id}
                className={`creator-notification-item ${!notification.is_read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="creator-notification-avatar">
                  {notification.user?.profile_image_url ? (
                    <Image
                      src={notification.user.profile_image_url}
                      alt={notification.user.username}
                      width={48}
                      height={48}
                      className="creator-notification-avatar-image"
                    />
                  ) : (
                    <div className="creator-notification-avatar-placeholder">
                      {notification.user?.display_name?.[0] || notification.user?.username[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="creator-notification-content">
                  <div className="creator-notification-text">
                    {getNotificationText(notification)}
                  </div>
                  <div className="creator-notification-time">
                    {formatTimeAgo(notification.created_at)}
                  </div>
                </div>
                {!notification.is_read && (
                  <div className="creator-notification-unread-dot" />
                )}
              </button>
            ))
          ) : (
            <div className="creator-notifications-empty">
              <p>No notifications yet</p>
            </div>
          )}
        </div>

        {/* Selected Post View (for like notifications) */}
        {selectedNotification && selectedNotification.content && (
          <div className="creator-notification-post-view">
            <div className="creator-notification-post-header">
              <h3 className="creator-notification-post-title">Liked Post</h3>
              <button
                className="creator-notification-post-close"
                onClick={() => setSelectedNotification(null)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="creator-notification-post-content">
              <h4 className="creator-notification-post-content-title">
                {selectedNotification.content.title}
              </h4>
              {selectedNotification.content.media_type === 'image' ? (
                <Image
                  src={selectedNotification.content.media_url}
                  alt={selectedNotification.content.title}
                  width={600}
                  height={600}
                  className="creator-notification-post-media"
                />
              ) : (
                <video
                  src={selectedNotification.content.media_url}
                  controls
                  className="creator-notification-post-media"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
