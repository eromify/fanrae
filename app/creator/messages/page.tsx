'use client'

import { useEffect, useState, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

interface Conversation {
  id: string
  creator_id: string
  fan_id: string
  last_message_at: string
  created_at: string
  fan?: {
    id: string
    username: string
    profile_image_url: string | null
  }
  creator?: {
    id: string
    username: string
    display_name: string | null
    profile_image_url: string | null
  }
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_type: 'creator' | 'fan'
  content: string | null
  media_url: string | null
  media_type: 'image' | 'video' | null
  created_at: string
  is_read: boolean
}

export default function CreatorMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isCreator, setIsCreator] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [tipAmount, setTipAmount] = useState('')
  const [isSendingTip, setIsSendingTip] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (userId) {
      fetchConversations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    // Check for conversationId in URL to auto-open
    const conversationId = searchParams.get('conversationId')
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId)
      if (conv) {
        setSelectedConversation(conv)
        // Clear the query param
        router.replace('/creator/messages', undefined)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, searchParams])

  useEffect(() => {
    if (selectedConversation && userId) {
      fetchMessages(selectedConversation.id)
      // Poll for new messages every 3 seconds
      const interval = setInterval(() => {
        fetchMessages(selectedConversation.id)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedConversation, userId])

  useEffect(() => {
    // Check for tip success in URL
    const tip = searchParams.get('tip')
    const conversationId = searchParams.get('conversationId')
    if (tip === 'success' && conversationId) {
      // Refresh messages and conversations
      if (selectedConversation?.id === conversationId) {
        fetchMessages(conversationId)
      }
      fetchConversations()
      // Clear URL params
      router.replace('/creator/messages', undefined)
    }
  }, [searchParams, selectedConversation, router])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const checkAuth = async () => {
    const supabase = createSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      setError('Not authenticated')
      setIsLoading(false)
      return
    }

    setUserId(session.user.id)

    // Check if user is a creator
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    setIsCreator(!!creator)
    setIsLoading(false)
  }

  const fetchConversations = async () => {
    if (!userId) return

    try {
      const response = await fetch(`/api/messages/conversations?userId=${userId}&userType=creator`)
      if (!response.ok) throw new Error('Failed to fetch conversations')

      const data = await response.json()
      setConversations(data.conversations || [])

      // Auto-select first conversation if none selected
      if (!selectedConversation && data.conversations && data.conversations.length > 0) {
        setSelectedConversation(data.conversations[0])
      }
    } catch (err: any) {
      console.error('Error fetching conversations:', err)
      setError(err.message)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    if (!userId) return

    try {
      const response = await fetch(`/api/messages/${conversationId}?userId=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch messages')

      const data = await response.json()
      setMessages(data.messages || [])
    } catch (err: any) {
      console.error('Error fetching messages:', err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !selectedConversation || !userId || isSending) return

    setIsSending(true)
    setError(null)

    try {
      const response = await fetch(`/api/messages/${selectedConversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          content: messageInput.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send message')
      }

      setMessageInput('')
      await fetchMessages(selectedConversation.id)
      await fetchConversations()
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(err.message)
    } finally {
      setIsSending(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedConversation || !userId || !isCreator) return

    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      alert('Only image and video files are supported')
      return
    }

    setIsSending(true)
    setError(null)

    try {
      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)
      formData.append('conversationId', selectedConversation.id)

      const uploadResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to upload file')
      }

      const { url, mediaType } = await uploadResponse.json()

      // Send message with media
      const messageResponse = await fetch(`/api/messages/${selectedConversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          mediaUrl: url,
          mediaType: mediaType
        })
      })

      if (!messageResponse.ok) {
        const errorData = await messageResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send message')
      }

      await fetchMessages(selectedConversation.id)
      await fetchConversations()
    } catch (err: any) {
      console.error('Error sending media:', err)
      setError(err.message)
    } finally {
      setIsSending(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSendTip = async () => {
    if (!selectedConversation || !userId || !tipAmount || parseFloat(tipAmount) < 1) {
      alert('Please enter a valid tip amount (minimum $1.00)')
      return
    }

    setIsSendingTip(true)
    setError(null)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user?.email) {
        throw new Error('User email not found')
      }

      const response = await fetch('/api/messages/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          userId,
          userEmail: session.user.email,
          amount: parseFloat(tipAmount)
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create tip')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      console.error('Error sending tip:', err)
      setError(err.message)
      setIsSendingTip(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="app-page">
        <div className="app-page-loading">Loading...</div>
      </div>
    )
  }

  if (error && !conversations.length) {
    return (
      <div className="app-page">
        <h1 className="app-page-title">Messages</h1>
        <p className="app-page-description">Error: {error}</p>
      </div>
    )
  }

  const otherUser = selectedConversation
    ? (isCreator ? selectedConversation.fan : selectedConversation.creator)
    : null

  return (
    <div className="app-page">
      <h1 className="app-page-title">Messages</h1>
      
      <div className="creator-messages-container">
        {/* Conversations List */}
        <div className="creator-messages-sidebar">
          <div className="creator-messages-conversations-list">
            {conversations.length > 0 ? (
              conversations.map((conv) => {
                const other = isCreator ? conv.fan : conv.creator
                return (
                  <button
                    key={conv.id}
                    className={`creator-messages-conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="creator-messages-conversation-avatar">
                      {other?.profile_image_url ? (
                        <Image
                          src={other.profile_image_url}
                          alt={other.username}
                          width={48}
                          height={48}
                          className="creator-messages-conversation-avatar-image"
                        />
                      ) : (
                        <div className="creator-messages-conversation-avatar-placeholder">
                          {(other?.username[0] || '?').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="creator-messages-conversation-info">
                      <div className="creator-messages-conversation-name">
                        {other?.username || 'Unknown'}
                      </div>
                      <div className="creator-messages-conversation-time">
                        {formatTime(conv.last_message_at)}
                      </div>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="creator-messages-empty">
                <p>No conversations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="creator-messages-chat">
          {selectedConversation && otherUser ? (
            <>
              {/* Chat Header */}
              <div className="creator-messages-chat-header">
                <div className="creator-messages-chat-header-user">
                  <div className="creator-messages-chat-header-avatar">
                    {(() => {
                      const displayName: string | null = ('display_name' in otherUser && otherUser.display_name) ? (otherUser.display_name as string | null) : null
                      const altText: string = displayName || otherUser.username
                      const initial: string = (displayName && displayName[0]) || otherUser.username[0] || '?'
                      
                      return otherUser.profile_image_url ? (
                        <Image
                          src={otherUser.profile_image_url}
                          alt={altText}
                          width={40}
                          height={40}
                          className="creator-messages-chat-header-avatar-image"
                        />
                      ) : (
                        <div className="creator-messages-chat-header-avatar-placeholder">
                          {initial.toUpperCase()}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="creator-messages-chat-header-info">
                    <div className="creator-messages-chat-header-name">
                      {(() => {
                        const displayName: string | null = ('display_name' in otherUser && otherUser.display_name) ? (otherUser.display_name as string | null) : null
                        return displayName || otherUser.username
                      })()}
                    </div>
                    <div className="creator-messages-chat-header-username">
                      @{otherUser.username}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="creator-messages-messages-list">
                {messages.map((message) => {
                  const isOwn = message.sender_id === userId
                  return (
                    <div
                      key={message.id}
                      className={`creator-messages-message ${isOwn ? 'own' : 'other'}`}
                    >
                      {message.media_url ? (
                        <div className="creator-messages-message-media">
                          {message.media_type === 'image' ? (
                            <Image
                              src={message.media_url}
                              alt="Message media"
                              width={400}
                              height={400}
                              className="creator-messages-message-media-image"
                            />
                          ) : (
                            <video
                              src={message.media_url}
                              controls
                              className="creator-messages-message-media-video"
                            />
                          )}
                        </div>
                      ) : null}
                      {message.content && (
                        <div className="creator-messages-message-content">
                          {message.content}
                        </div>
                      )}
                      <div className="creator-messages-message-time">
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="creator-messages-input-form">
                {error && (
                  <div className="creator-messages-error">{error}</div>
                )}
                <div className="creator-messages-input-wrapper">
                  <input
                    type="text"
                    className="creator-messages-input"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={isSending}
                  />
                  {isCreator ? (
                    <button
                      type="button"
                      className="creator-messages-media-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSending}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L22 16M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="creator-messages-tip-btn"
                      onClick={() => setShowTipModal(true)}
                      disabled={isSending}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                  <button
                    type="submit"
                    className="creator-messages-send-btn"
                    disabled={isSending || !messageInput.trim()}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
              </form>
            </>
          ) : (
            <div className="creator-messages-no-selection">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && (
        <div className="creator-messages-tip-modal-overlay" onClick={() => setShowTipModal(false)}>
          <div className="creator-messages-tip-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="creator-messages-tip-modal-title">Send Tip</h3>
            <p className="creator-messages-tip-modal-description">
              Show your appreciation with a tip
            </p>
            <div className="creator-messages-tip-modal-input-wrapper">
              <span className="creator-messages-tip-modal-dollar">$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                className="creator-messages-tip-modal-input"
                placeholder="0.00"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
              />
            </div>
            <div className="creator-messages-tip-modal-actions">
              <button
                className="creator-messages-tip-modal-cancel"
                onClick={() => {
                  setShowTipModal(false)
                  setTipAmount('')
                }}
              >
                Cancel
              </button>
              <button
                className="creator-messages-tip-modal-send"
                onClick={handleSendTip}
                disabled={isSendingTip || !tipAmount || parseFloat(tipAmount) < 1}
              >
                {isSendingTip ? 'Processing...' : 'Send Tip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
