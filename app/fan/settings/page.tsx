'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDeleteAccount = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setIsDeleting(true)

    try {
      const supabase = createSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        alert('Not authenticated')
        setIsDeleting(false)
        return
      }

      // Call delete account API
      const response = await fetch(`/api/account/delete?userId=${session.user.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      // Sign out and redirect to home
      await supabase.auth.signOut()
      router.push('/')
    } catch (error: any) {
      console.error('Error deleting account:', error)
      alert(error.message || 'Failed to delete account. Please try again.')
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  const handleCancelDelete = () => {
    setShowConfirm(false)
  }

  return (
    <div className="app-page">
      <h1 className="app-page-title">Settings</h1>
      
      <div className="settings-content">
        {/* Account Deletion Section */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">Account Deletion</h2>
            <p className="settings-section-description">
              All subscriptions on this account will be canceled.
            </p>
          </div>

          {!showConfirm ? (
            <button
              className="settings-delete-btn"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              Delete Account
            </button>
          ) : (
            <div className="settings-delete-confirm">
              <p className="settings-delete-confirm-text">
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <div className="settings-delete-confirm-actions">
                <button
                  className="settings-delete-confirm-btn"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Account'}
                </button>
                <button
                  className="settings-delete-cancel-btn"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
