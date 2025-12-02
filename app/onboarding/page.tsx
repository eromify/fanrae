'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createSupabaseClient } from '@/lib/supabase/client'
import { checkCreatorStatus, saveCreatorType } from '@/lib/supabase/creator'

interface OnboardingStep {
  icon: string
  title: string
  highlightedText?: string
  titleHasHighlight?: boolean
}

const onboardingSteps: OnboardingStep[] = [
  {
    icon: '/onboarding icon1.webp',
    title: 'Average Creator earnings',
    highlightedText: '$3k - $10k per month!',
    titleHasHighlight: false,
  },
  {
    icon: '/onboarding icon2.webp',
    title: 'Fanvue is a place for **ALL**\ncreators to generate income',
    titleHasHighlight: true,
  },
  {
    icon: '/onboarding icon3.webp',
    title: 'Sign up now and take **80%** of the earnings',
    titleHasHighlight: true,
  },
  {
    icon: '/onboarding icon4.webp',
    title: 'Access **advanced** **insights** to earn even more',
    titleHasHighlight: true,
  },
  {
    icon: '/onboarding icon5.webp',
    title: 'Earn **5%** for every creator you invite to Fanvue',
    titleHasHighlight: true,
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1) // Start with second page (index 1)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showCreatorType, setShowCreatorType] = useState(false)
  const [selectedCreatorType, setSelectedCreatorType] = useState<'ai' | 'human' | null>(null)
  const [showContentType, setShowContentType] = useState(false)
  const [selectedContentType, setSelectedContentType] = useState<'18+' | 'general' | null>(null)
  const [showDisplayName, setShowDisplayName] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    // Auto-slide for mobile only (skip if showing creator type selection)
    if (!isAuthenticated || isLoading || showCreatorType) return

    // Check if we're on mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    if (!isMobile) return // Don't auto-slide on desktop

    // Set up auto-slide interval for mobile
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % onboardingSteps.length
        return next
      })
    }, 3000) // Change slide every 3 seconds

    // Cleanup interval on unmount or when dependencies change
    return () => {
      clearInterval(interval)
    }
  }, [isAuthenticated, isLoading, showCreatorType])

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

      // Check if user is a paid creator - if so, redirect to app
      const creatorStatus = await checkCreatorStatus(session.user.id)
      if (creatorStatus.isCreator && creatorStatus.hasPaid) {
        // Creator has paid - redirect to app (when it exists)
        // For now, redirect to home
        router.push('/')
        return
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNext = () => {
    setCurrentStep((prev) => (prev + 1) % onboardingSteps.length)
  }

  const handlePrev = () => {
    setCurrentStep((prev) => (prev - 1 + onboardingSteps.length) % onboardingSteps.length)
  }

  const handleStartEarning = () => {
    // Navigate to creator type selection
    setShowCreatorType(true)
  }

  const handleCreatorTypeSelect = (type: 'ai' | 'human') => {
    setSelectedCreatorType(type)
  }

  const handleContinue = async () => {
    if (selectedCreatorType) {
      try {
        const supabase = createSupabaseClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          // Save creator type
          await saveCreatorType(session.user.id, selectedCreatorType)
          // Navigate to content type selection
          setShowCreatorType(false)
          setShowContentType(true)
        }
      } catch (error) {
        console.error('Failed to save creator type:', error)
      }
    }
  }

  const handleContentTypeSelect = (type: '18+' | 'general') => {
    setSelectedContentType(type)
  }

  const handleContentTypeContinue = async () => {
    if (selectedContentType) {
      try {
        const supabase = createSupabaseClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          // TODO: Save content type to database
          // Navigate to display name & handle step
          setShowContentType(false)
          setShowDisplayName(true)
        }
      } catch (error) {
        console.error('Failed to save content type:', error)
      }
    }
  }

  const handleDisplayNameContinue = async () => {
    if (displayName.trim() && handle.trim()) {
      try {
        const supabase = createSupabaseClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          // Remove @ if user included it and trim whitespace
          const cleanHandle = handle.replace(/^@/, '').trim().toLowerCase()

          if (!cleanHandle) {
            alert('Please enter a valid handle.')
            return
          }

          // Validate handle format (alphanumeric and underscores only)
          if (!/^[a-z0-9_]+$/.test(cleanHandle)) {
            alert('Handle can only contain letters, numbers, and underscores.')
            return
          }

          // Check if handle is already taken (excluding current user's creator profile)
          const { data: creator } = await supabase
            .from('creators')
            .select('id')
            .eq('user_id', session.user.id)
            .single()

          const { data: existingCreator } = await supabase
            .from('creators')
            .select('id')
            .eq('username', cleanHandle)
            .maybeSingle()

          // If handle is taken by someone else (not the current user)
          if (existingCreator && (!creator || existingCreator.id !== creator.id)) {
            alert('This handle is already taken. Please choose another one.')
            return
          }

          if (creator) {
            // Update existing creator
            const { error } = await supabase
              .from('creators')
              .update({
                display_name: displayName.trim(),
                username: cleanHandle,
                page_url: `@${cleanHandle}`,
              })
              .eq('id', creator.id)

            if (error) {
              // Check if it's a unique constraint violation
              if (error.code === '23505' || error.message?.includes('unique')) {
                alert('This handle is already taken. Please choose another one.')
                return
              }
              throw error
            }
          } else {
            // Create new creator profile
            const { error } = await supabase.from('creators').insert({
              user_id: session.user.id,
              display_name: displayName.trim(),
              username: cleanHandle,
              page_url: `@${cleanHandle}`,
            })

            if (error) {
              // Check if it's a unique constraint violation
              if (error.code === '23505' || error.message?.includes('unique')) {
                alert('This handle is already taken. Please choose another one.')
                return
              }
              throw error
            }
          }

          // TODO: Navigate to payment page (when created)
          console.log('Display name and handle saved')
        }
      } catch (error: any) {
        console.error('Failed to save display name and handle:', error)
        if (error.message?.includes('unique')) {
          alert('This handle is already taken. Please choose another one.')
        }
      }
    }
  }

  const handleSkip = async () => {
    // Skip to next step (payment page when created)
    // For now, just log
    console.log('Skipped display name & handle')
    // TODO: Navigate to payment page
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

  // Show display name & handle page
  if (showDisplayName) {
    return (
      <div className="onboarding-page onboarding-page-creator-type">
        <div className="creator-type-container">
          {/* Header with progress */}
          <div className="creator-type-header">
            <button
              className="creator-type-back-btn"
              onClick={() => {
                setShowDisplayName(false)
                setShowContentType(true)
              }}
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
            <div className="creator-type-title">Display name & handle</div>
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
            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
              <div
                key={index}
                className={`progress-dot ${index === 2 ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="creator-type-content display-name-content">
            <h1 className="creator-type-heading display-name-heading">Create your name & handle</h1>

            {/* Form fields */}
            <div className="display-name-form">
              <div className="form-field-group">
                <label htmlFor="display-name" className="form-field-label">
                  Display name
                </label>
                <input
                  type="text"
                  id="display-name"
                  className="form-field-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                />
                <p className="form-field-helper">
                  The name shown on your profile and in messages.
                </p>
              </div>

              <div className="form-field-group">
                <label htmlFor="handle" className="form-field-label">
                  Handle
                </label>
                <div className="handle-input-wrapper">
                  <span className="handle-prefix">@</span>
                  <input
                    type="text"
                    id="handle"
                    className="form-field-input handle-input"
                    value={handle}
                    onChange={(e) => {
                      // Remove @ if user types it, we'll add it automatically
                      const value = e.target.value.replace(/^@/, '')
                      setHandle(value)
                    }}
                    placeholder="generic_handle"
                  />
                </div>
                <p className="form-field-helper">Your unique @username</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="display-name-actions">
              <button
                className="creator-type-continue-btn"
                onClick={handleDisplayNameContinue}
                disabled={!displayName.trim() || !handle.trim()}
              >
                Continue
              </button>
              <button
                className="display-name-skip-btn"
                onClick={handleSkip}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show content type selection page
  if (showContentType) {
    return (
      <div className="onboarding-page onboarding-page-creator-type">
        <div className="creator-type-container">
          {/* Header with progress */}
          <div className="creator-type-header">
            <button
              className="creator-type-back-btn"
              onClick={() => {
                setShowContentType(false)
                setShowCreatorType(true)
              }}
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
            <div className="creator-type-title">Content</div>
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
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className={`progress-dot ${index === 1 ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="creator-type-content">
            <h1 className="creator-type-heading">What kind of content will you be creating?</h1>
            <p className="creator-type-description">
              We&apos;ll tailor your onboarding based on your content type.
              There&apos;s no wrong choice - just pick what fits you best.
            </p>

            {/* Content type cards */}
            <div className="creator-type-cards">
              <button
                className={`creator-type-card creator-type-card-ai ${
                  selectedContentType === '18+' ? 'selected' : ''
                }`}
                onClick={() => handleContentTypeSelect('18+')}
              >
                <div className="creator-type-icon">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Lock icon */}
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="10"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M9 11V7C9 4.79 10.79 3 13 3C15.21 3 17 4.79 17 7V11"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                  </svg>
                </div>
                <h3 className="creator-type-card-title">18+ Content</h3>
                <p className="creator-type-card-description">
                  Your content includes nudity, adult themes, or is for mature audiences.
                </p>
              </button>

              <button
                className={`creator-type-card creator-type-card-human ${
                  selectedContentType === 'general' ? 'selected' : ''
                }`}
                onClick={() => handleContentTypeSelect('general')}
              >
                <div className="creator-type-icon">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="creator-type-card-title">General Content</h3>
                <p className="creator-type-card-description">
                  Your content will be suitable for all audiences of all ages.
                </p>
              </button>
            </div>

            {/* Continue button */}
            <button
              className="creator-type-continue-btn"
              onClick={handleContentTypeContinue}
              disabled={!selectedContentType}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show creator type selection page
  if (showCreatorType) {
    return (
      <div className="onboarding-page onboarding-page-creator-type">
        <div className="creator-type-container">
          {/* Header with progress */}
          <div className="creator-type-header">
            <button
              className="creator-type-back-btn"
              onClick={() => setShowCreatorType(false)}
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
            <div className="creator-type-title">Creator Type</div>
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
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className={`progress-dot ${index === 0 ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="creator-type-content">
            <h1 className="creator-type-heading">Select your creator type</h1>
            <p className="creator-type-description">
              We&apos;ll tailor your onboarding based on your creator type.
              There&apos;s no wrong choice - just pick what fits you best.
            </p>

            {/* Creator type cards */}
            <div className="creator-type-cards">
              <button
                className={`creator-type-card creator-type-card-ai ${
                  selectedCreatorType === 'ai' ? 'selected' : ''
                }`}
                onClick={() => handleCreatorTypeSelect('ai')}
              >
                <div className="creator-type-icon">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Sparkles/Stars only */}
                    <path
                      d="M12 2L12.5 3.5L14 4L12.5 4.5L12 6L11.5 4.5L10 4L11.5 3.5L12 2Z"
                      fill="currentColor"
                    />
                    <path
                      d="M5 7L5.5 8.5L7 9L5.5 9.5L5 11L4.5 9.5L3 9L4.5 8.5L5 7Z"
                      fill="currentColor"
                    />
                    <path
                      d="M19 7L19.5 8.5L21 9L19.5 9.5L19 11L18.5 9.5L17 9L18.5 8.5L19 7Z"
                      fill="currentColor"
                    />
                    <path
                      d="M8 12L8.5 13.5L10 14L8.5 14.5L8 16L7.5 14.5L6 14L7.5 13.5L8 12Z"
                      fill="currentColor"
                    />
                    <path
                      d="M16 12L16.5 13.5L18 14L16.5 14.5L16 16L15.5 14.5L14 14L15.5 13.5L16 12Z"
                      fill="currentColor"
                    />
                    <path
                      d="M12 18L12.5 19.5L14 20L12.5 20.5L12 22L11.5 20.5L10 20L11.5 19.5L12 18Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <h3 className="creator-type-card-title">AI Creator</h3>
                <p className="creator-type-card-description">
                  Primarily generated or significantly edited using AI tools.
                </p>
              </button>

              <button
                className={`creator-type-card creator-type-card-human ${
                  selectedCreatorType === 'human' ? 'selected' : ''
                }`}
                onClick={() => handleCreatorTypeSelect('human')}
              >
                <div className="creator-type-icon">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M6 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3a4.5 4.5 0 0 1 4.5 4.5V20"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
                <h3 className="creator-type-card-title">Human Creator</h3>
                <p className="creator-type-card-description">
                  Content will be of yourself with no use of AI tools.
                </p>
              </button>
            </div>

            {/* Continue button */}
            <button
              className="creator-type-continue-btn"
              onClick={handleContinue}
              disabled={!selectedCreatorType}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show carousel steps
  const step = onboardingSteps[currentStep]
  const titleParts = step.title.split('**')

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        {/* Desktop Navigation - Left Arrow */}
        <button
          className="onboarding-nav-btn onboarding-nav-left"
          onClick={handlePrev}
          aria-label="Previous step"
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

        {/* Content */}
        <div className="onboarding-content">
          <div className="onboarding-icon">
            <Image
              src={step.icon}
              alt={`Onboarding step ${currentStep + 1}`}
              width={400}
              height={400}
              priority
              className="onboarding-icon-image"
            />
          </div>

          {step.titleHasHighlight ? (
            <div className="onboarding-text">
              {titleParts.map((part, index) => {
                if (index % 2 === 1) {
                  // This is highlighted text
                  return (
                    <span key={index} className="onboarding-text-highlight">
                      {part}
                    </span>
                  )
                }
                return <span key={index}>{part}</span>
              })}
            </div>
          ) : (
            <>
              <div className="onboarding-text">{step.title}</div>
              {step.highlightedText && (
                <div className="onboarding-highlight">
                  {step.highlightedText}
                </div>
              )}
            </>
          )}

          <button className="onboarding-cta" onClick={handleStartEarning}>
            Start earning
          </button>

          <div className="onboarding-disclaimer">
            By becoming a creator on Fanvue you reconfirm your agreement to our Terms & Conditions, Acceptable Use Policy, and Privacy Policy.
          </div>
        </div>

        {/* Desktop Navigation - Right Arrow */}
        <button
          className="onboarding-nav-btn onboarding-nav-right"
          onClick={handleNext}
          aria-label="Next step"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

