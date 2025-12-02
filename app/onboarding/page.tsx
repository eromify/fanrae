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
          // TODO: Navigate to payment page (when created)
          // For now, just log
          console.log('Creator type saved:', selectedCreatorType)
        }
      } catch (error) {
        console.error('Failed to save creator type:', error)
      }
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

