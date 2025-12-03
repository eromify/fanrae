'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

interface SalesBreakdown {
  category: 'subscriptions' | 'tips' | 'premiumPosts'
  label: string
  amount: number
}

interface DailyDataPoint {
  date: string
  amount: number
}

interface SalesData {
  totalSales: number
  subscriptions: number
  tips: number
  premiumPosts: number
  salesBreakdown: SalesBreakdown[]
  dailyData: {
    subscriptions: DailyDataPoint[]
    tips: DailyDataPoint[]
    premiumPosts: DailyDataPoint[]
  }
}

export default function CreatorEarningsPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSalesData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchSalesData = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      const response = await fetch(`/api/creator/sales?userId=${session.user.id}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch sales data')
      }

      const data = await response.json()
      setSalesData(data)
    } catch (err: any) {
      console.error('Error fetching sales data:', err)
      setError(err.message || 'Failed to load earnings')
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
        <h1 className="app-page-title">Earnings</h1>
        <p className="app-page-description">Error: {error}</p>
      </div>
    )
  }

  // Calculate max sales for bar graph scaling (Total Sales)
  const maxSales = salesData?.salesBreakdown.length 
    ? Math.max(...salesData.salesBreakdown.map(item => item.amount), 1)
    : 1

  // Render Total Sales card with 3-bar graph
  const renderTotalSalesCard = () => {
    return (
      <div className="creator-home-sales-section">
        <div className="creator-home-sales-header">
          <h2 className="creator-home-sales-title">Total Sales</h2>
          <div className="creator-home-sales-total">
            ${(salesData?.totalSales || 0).toFixed(2)}
          </div>
        </div>

        {/* Sales Graph - 3-bar breakdown */}
        {salesData && salesData.salesBreakdown && salesData.salesBreakdown.length > 0 ? (
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
        ) : (
          <div className="creator-home-sales-empty">
            <p>No sales data yet</p>
          </div>
        )}
      </div>
    )
  }

  // Render line graph card for subscriptions, tips, or premium posts
  const renderLineGraphCard = (title: string, amount: number, dailyData: DailyDataPoint[]) => {
    // Calculate max amount for scaling
    const maxAmount = dailyData.length > 0 
      ? Math.max(...dailyData.map(d => d.amount), 1)
      : 1

    // Get date range
    const dates = dailyData.map(d => d.date)
    const minDate = dates.length > 0 ? dates[0] : new Date().toISOString().split('T')[0]
    const maxDate = dates.length > 0 ? dates[dates.length - 1] : new Date().toISOString().split('T')[0]

    // Create points for the line graph
    const points = dailyData.map((point, index) => {
      const x = (index / Math.max(dailyData.length - 1, 1)) * 100 // Percentage across width
      const y = 100 - (point.amount / maxAmount) * 100 // Percentage from bottom
      return { x, y, amount: point.amount, date: point.date }
    })

    // Create path for the line
    const pathData = points.length > 0
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : ''

    return (
      <div className="creator-home-sales-section">
        <div className="creator-home-sales-header">
          <h2 className="creator-home-sales-title">{title}</h2>
          <div className="creator-home-sales-total">
            ${amount.toFixed(2)}
          </div>
        </div>

        {/* Line Graph */}
        {dailyData.length > 0 ? (
          <div className="creator-earnings-line-graph">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="creator-earnings-line-graph-svg">
              {/* Gradient definition */}
              <defs>
                <linearGradient id={`gradient-${title.toLowerCase().replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                </linearGradient>
              </defs>
              
              {/* Area under the line */}
              {pathData && (
                <path
                  d={`${pathData} L 100 100 L 0 100 Z`}
                  fill={`url(#gradient-${title.toLowerCase().replace(/\s+/g, '-')})`}
                  className="creator-earnings-line-graph-area"
                />
              )}
              
              {/* Line */}
              {pathData && (
                <path
                  d={pathData}
                  fill="none"
                  stroke="rgba(59, 130, 246, 1)"
                  strokeWidth="0.5"
                  className="creator-earnings-line-graph-line"
                />
              )}
              
              {/* Points */}
              {points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="0.8"
                  fill="rgba(59, 130, 246, 1)"
                  className="creator-earnings-line-graph-point"
                />
              ))}
            </svg>
          </div>
        ) : (
          <div className="creator-home-sales-empty">
            <p>No data yet</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app-page">
      <h1 className="app-page-title">Earnings</h1>
      <p className="app-page-description">Track your earnings across all revenue streams</p>

      <div className="creator-earnings-container">
        {/* Total Sales - with 3-bar graph */}
        {renderTotalSalesCard()}

        {/* Subscriptions - with line graph */}
        {renderLineGraphCard(
          'Subscriptions',
          salesData?.subscriptions || 0,
          salesData?.dailyData?.subscriptions || []
        )}

        {/* Tips - with line graph */}
        {renderLineGraphCard(
          'Tips',
          salesData?.tips || 0,
          salesData?.dailyData?.tips || []
        )}

        {/* Premium Posts - with line graph */}
        {renderLineGraphCard(
          'Premium Posts',
          salesData?.premiumPosts || 0,
          salesData?.dailyData?.premiumPosts || []
        )}
      </div>
    </div>
  )
}
