'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function FanSetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  const checkAuth = async () => {
    try {
      const supabase = createSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      setIsAuthenticated(true)
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = async () => {
    if (!username.trim() || !dateOfBirth || !agreedToTerms) {
      return
    }

    // Validate username format (alphanumeric and underscores only)
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase()
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      alert('Username can only contain letters, numbers, and underscores.')
      return
    }

    // Validate date of birth (must be 18+)
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age

    if (actualAge < 18) {
      alert('You must be at least 18 years old to use this platform.')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        alert('Please log in to continue')
        return
      }

      // Check if username is already taken
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', cleanUsername)
        .maybeSingle()

      if (existingProfile && existingProfile.id !== session.user.id) {
        alert('This username is already taken. Please choose another one.')
        setIsSubmitting(false)
        return
      }

      // Update or insert profile with fan data
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          username: cleanUsername,
          date_of_birth: dateOfBirth,
          user_type: 'fan', // Mark as fan
        }, {
          onConflict: 'id'
        })

      if (error) {
        if (error.code === '23505' || error.message?.includes('unique')) {
          alert('This username is already taken. Please choose another one.')
        } else {
          throw error
        }
        setIsSubmitting(false)
        return
      }

      // Navigate to fan app
      router.push('/fan/home')
    } catch (error: any) {
      console.error('Failed to save fan profile:', error)
      alert('Failed to save your information. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-loading">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="onboarding-page onboarding-page-creator-type">
      <div className="creator-type-container">
        {/* Header */}
        <div className="creator-type-header">
          <button
            className="creator-type-back-btn"
            onClick={() => router.push('/onboarding')}
            aria-label="Go back"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="creator-type-title">Fan Setup</div>
          <button
            className="creator-type-close-btn"
            onClick={() => router.push('/')}
            aria-label="Close"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Progress dots */}
        <div className="creator-type-progress">
          {[0, 1].map((index) => (
            <div
              key={index}
              className={`progress-dot ${index === 0 ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="creator-type-content display-name-content">
          <h1 className="creator-type-heading display-name-heading">Complete your profile</h1>
          <p className="creator-type-description">
            Let&apos;s set up your fan account to get started.
          </p>

          {/* Form fields */}
          <div className="display-name-form">
            <div className="form-field-group">
              <label htmlFor="username" className="form-field-label">
                Username
              </label>
              <div className="handle-input-wrapper">
                <span className="handle-prefix">@</span>
                <input
                  type="text"
                  id="username"
                  className="form-field-input handle-input"
                  value={username}
                  onChange={(e) => {
                    // Remove @ if user types it, we'll add it automatically
                    const value = e.target.value.replace(/^@/, '')
                    setUsername(value)
                  }}
                  placeholder="your_username"
                />
              </div>
              <p className="form-field-helper">Your unique @username</p>
            </div>

            <div className="form-field-group">
              <label htmlFor="date-of-birth" className="form-field-label">
                Date of Birth
              </label>
              <input
                type="date"
                id="date-of-birth"
                className="form-field-input"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              />
              <p className="form-field-helper">You must be at least 18 years old</p>
            </div>

            <div className="form-field-group">
              <label className="form-field-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={{
                    marginTop: '4px',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: '#00d26a',
                  }}
                />
                <span style={{ flex: 1, fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.5' }}>
                  I agree to the Terms of Service and Privacy Policy
                </span>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="display-name-actions">
            <button
              className="creator-type-continue-btn"
              onClick={handleContinue}
              disabled={!username.trim() || !dateOfBirth || !agreedToTerms || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

