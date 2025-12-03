'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

interface Payout {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'canceled'
  created_at: string
  paid_date: string | null
  stripe_transfer_id: string | null
}

interface PayoutData {
  totalRevenue: number
  totalNetProfit: number
  availablePayouts: number
  pendingPayouts: number
  totalReceived: number
  payouts: Payout[]
}

export default function CreatorPayoutsPage() {
  const [payoutData, setPayoutData] = useState<PayoutData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchPayoutData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPayoutData = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      const response = await fetch(`/api/creator/payouts?userId=${session.user.id}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch payout data')
      }

      const data = await response.json()
      setPayoutData(data)
    } catch (err: any) {
      console.error('Error fetching payout data:', err)
      setError(err.message || 'Failed to load payouts')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayoutNow = async () => {
    if (!payoutData || payoutData.availablePayouts <= 0) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setError('Not authenticated')
        setIsProcessing(false)
        return
      }

      const response = await fetch('/api/creator/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          amount: payoutData.availablePayouts
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to initiate payout')
      }

      // Refresh payout data
      await fetchPayoutData()
    } catch (err: any) {
      console.error('Error initiating payout:', err)
      setError(err.message || 'Failed to process payout')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'rgba(34, 197, 94, 1)'
      case 'processing':
        return 'rgba(59, 130, 246, 1)'
      case 'pending':
        return 'rgba(251, 191, 36, 1)'
      case 'failed':
        return 'rgba(239, 68, 68, 1)'
      default:
        return 'rgba(255, 255, 255, 0.5)'
    }
  }

  if (isLoading) {
    return (
      <div className="app-page">
        <div className="app-page-loading">Loading...</div>
      </div>
    )
  }

  if (error && !payoutData) {
    return (
      <div className="app-page">
        <h1 className="app-page-title">Payouts</h1>
        <p className="app-page-description">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="app-page">
      <h1 className="app-page-title">Payouts</h1>
      <p className="app-page-description">Manage your earnings and payouts</p>

      {/* Summary Cards */}
      <div className="creator-payouts-summary">
        <div className="creator-payouts-summary-card">
          <div className="creator-payouts-summary-label">Total Revenue</div>
          <div className="creator-payouts-summary-value">
            {formatCurrency(payoutData?.totalRevenue || 0)}
          </div>
          <div className="creator-payouts-summary-hint">All earnings including platform commission</div>
        </div>

        <div className="creator-payouts-summary-card">
          <div className="creator-payouts-summary-label">Net Profit</div>
          <div className="creator-payouts-summary-value" style={{ color: 'rgba(34, 197, 94, 1)' }}>
            {formatCurrency(payoutData?.totalNetProfit || 0)}
          </div>
          <div className="creator-payouts-summary-hint">80% of revenue</div>
        </div>

        <div className="creator-payouts-summary-card highlight">
          <div className="creator-payouts-summary-label">Available Now</div>
          <div className="creator-payouts-summary-value" style={{ color: 'rgba(59, 130, 246, 1)' }}>
            {formatCurrency(payoutData?.availablePayouts || 0)}
          </div>
          <button
            onClick={handlePayoutNow}
            disabled={isProcessing || !payoutData || payoutData.availablePayouts <= 0}
            className="creator-payouts-payout-btn"
          >
            {isProcessing ? 'Processing...' : 'Payout Now'}
          </button>
        </div>

        <div className="creator-payouts-summary-card">
          <div className="creator-payouts-summary-label">Available Soon</div>
          <div className="creator-payouts-summary-value">
            {formatCurrency(payoutData?.pendingPayouts || 0)}
          </div>
          <div className="creator-payouts-summary-hint">Pending payouts</div>
        </div>

        <div className="creator-payouts-summary-card">
          <div className="creator-payouts-summary-label">Total Received</div>
          <div className="creator-payouts-summary-value" style={{ color: 'rgba(34, 197, 94, 1)' }}>
            {formatCurrency(payoutData?.totalReceived || 0)}
          </div>
          <div className="creator-payouts-summary-hint">Already paid out</div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="creator-payouts-error">
          {error}
        </div>
      )}

      {/* Payout History */}
      <div className="creator-payouts-history">
        <h2 className="creator-payouts-history-title">Payout History</h2>
        {payoutData && payoutData.payouts.length > 0 ? (
          <div className="creator-payouts-history-list">
            {payoutData.payouts.map((payout) => (
              <div key={payout.id} className="creator-payouts-history-item">
                <div className="creator-payouts-history-info">
                  <div className="creator-payouts-history-amount">
                    {formatCurrency(payout.amount)}
                  </div>
                  <div className="creator-payouts-history-date">
                    {payout.paid_date ? formatDate(payout.paid_date) : formatDate(payout.created_at)}
                  </div>
                  {payout.stripe_transfer_id && (
                    <div className="creator-payouts-history-transfer-id">
                      Transfer ID: {payout.stripe_transfer_id}
                    </div>
                  )}
                </div>
                <div className="creator-payouts-history-status">
                  <span
                    className="creator-payouts-history-status-badge"
                    style={{ backgroundColor: getStatusColor(payout.status) + '20', color: getStatusColor(payout.status) }}
                  >
                    {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="creator-payouts-history-empty">
            <p>No payout history yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
