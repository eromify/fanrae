'use client'

import { useEffect, useState } from 'react'
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
}

interface SalesBreakdown {
  category: 'subscriptions' | 'tips' | 'premiumPosts'
  label: string
  amount: number
}

interface SalesData {
  totalSales: number
  subscriptions: number
  tips: number
  premiumPosts: number
  salesBreakdown: SalesBreakdown[]
}

export default function CreatorHomePage() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      // Fetch profile
      const profileResponse = await fetch(`/api/creator/profile?userId=${session.user.id}`)
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        if (profileData.creator) {
          setProfile(profileData.creator)
        }
      }

      // Fetch sales data
      const salesResponse = await fetch(`/api/creator/sales?userId=${session.user.id}`)
      if (salesResponse.ok) {
        const sales = await salesResponse.json()
        setSalesData(sales)
      }
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to load data')
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

  if (error) {
    return (
      <div className="app-page">
        <h1 className="app-page-title">Home</h1>
        <p className="app-page-description">Error: {error}</p>
      </div>
    )
  }

  const profileLink = profile 
    ? `${typeof window !== 'undefined' ? window.location.origin : 'fanrae.com'}/${profile.username}`
    : ''

  // Calculate max sales for graph scaling
  const maxSales = salesData?.salesBreakdown.length 
    ? Math.max(...salesData.salesBreakdown.map(item => item.amount), 1)
    : 1

  return (
    <div className="app-page">
      <h1 className="app-page-title">Home</h1>

      <div className="creator-home-container">
        {/* Profile Block (Smaller) */}
        <div className="creator-home-profile-block">
          {/* Banner */}
          <div className="creator-home-profile-banner">
            {profile?.banner_image_url ? (
              <Image
                src={profile.banner_image_url}
                alt="Banner"
                width={800}
                height={150}
                className="creator-home-profile-banner-image"
              />
            ) : (
              <div className="creator-home-profile-banner-placeholder" />
            )}
          </div>

          {/* Profile Info */}
          <div className="creator-home-profile-info">
            <div className="creator-home-profile-picture-wrapper">
              {profile?.profile_image_url ? (
                <Image
                  src={profile.profile_image_url}
                  alt="Profile"
                  width={80}
                  height={80}
                  className="creator-home-profile-picture"
                />
              ) : (
                <div className="creator-home-profile-picture-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Username */}
            <div className="creator-home-profile-field">
              <span className="creator-home-profile-label">@</span>
              <span className="creator-home-profile-value">{profile?.username || 'Not set'}</span>
            </div>

            {/* Display Name */}
            {profile?.display_name && (
              <div className="creator-home-profile-field">
                <span className="creator-home-profile-value-large">{profile.display_name}</span>
              </div>
            )}

            {/* Bio (truncated) */}
            {profile?.bio && (
              <div className="creator-home-profile-field">
                <p className="creator-home-profile-bio">{profile.bio.length > 100 ? `${profile.bio.substring(0, 100)}...` : profile.bio}</p>
              </div>
            )}

            {/* Social Media */}
            {(profile?.instagram_url || profile?.twitter_url) && (
              <div className="creator-home-profile-social">
                {profile.instagram_url && (
                  <a
                    href={profile.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="creator-home-profile-social-link"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                {profile.twitter_url && (
                  <a
                    href={profile.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="creator-home-profile-social-link"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Link */}
            <div className="creator-home-profile-field">
              <div className="creator-home-profile-field-row">
                <span className="creator-home-profile-label">Link:</span>
                <span className="creator-home-profile-link">{profileLink || 'Not available'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Sales Section */}
        <div className="creator-home-sales-section">
          <div className="creator-home-sales-header">
            <h2 className="creator-home-sales-title">Total Sales</h2>
            <div className="creator-home-sales-total">
              ${salesData?.totalSales.toFixed(2) || '0.00'}
            </div>
          </div>

          {/* Sales Graph */}
          {salesData && salesData.salesBreakdown.length > 0 && (
            <div className="creator-home-sales-graph">
              <div className="creator-home-sales-graph-bars">
                {salesData.salesBreakdown.map((item) => {
                  const height = maxSales > 0 ? (item.amount / maxSales) * 100 : 0
                  return (
                    <div key={item.category} className="creator-home-sales-graph-bar-wrapper">
                      <div className="creator-home-sales-graph-bar-container">
                        <div
                          className="creator-home-sales-graph-bar"
                          style={{ height: `${height}%` }}
                          title={`${item.label}: $${item.amount.toFixed(2)}`}
                        />
                      </div>
                      <div className="creator-home-sales-graph-label">
                        {item.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(!salesData || salesData.salesBreakdown.length === 0) && (
            <div className="creator-home-sales-empty">
              <p>No sales data yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
