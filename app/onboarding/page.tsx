'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createSupabaseClient } from '@/lib/supabase/client'
import { checkCreatorStatus, saveCreatorType, saveSubscriptionPrice } from '@/lib/supabase/creator'

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
  const [currentStep, setCurrentStep] = useState(0) // Start with first page (index 0)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showCreatorType, setShowCreatorType] = useState(false)
  const [selectedCreatorType, setSelectedCreatorType] = useState<'ai' | 'human' | null>(null)
  const [showContentType, setShowContentType] = useState(false)
  const [selectedContentType, setSelectedContentType] = useState<'18+' | 'general' | null>(null)
  const [showDisplayName, setShowDisplayName] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [showSubscriptionPrice, setShowSubscriptionPrice] = useState(false)
  const [subscriptionPrice, setSubscriptionPrice] = useState('9.99')
  const [showPlans, setShowPlans] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(24 * 60 * 60) // 24 hours in seconds
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showWelcomePage, setShowWelcomePage] = useState(true)

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Countdown timer for annual plan offer
  useEffect(() => {
    if (showPlans) {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            return 24 * 60 * 60 // Reset to 24 hours
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [showPlans])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    // Auto-slide for both desktop and mobile (skip if showing welcome page or creator type selection)
    if (!isAuthenticated || isLoading || showWelcomePage || showCreatorType) return

    // Set up auto-slide interval
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

          // Navigate to subscription price page
          setShowDisplayName(false)
          setShowSubscriptionPrice(true)
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
    // Navigate to subscription price page
    setShowDisplayName(false)
    setShowSubscriptionPrice(true)
    console.log('Skipped display name & handle')
  }

  const handleSubscriptionPriceContinue = async () => {
    if (!subscriptionPrice) return

    const price = parseFloat(subscriptionPrice)
    if (isNaN(price) || price < 3.99 || price > 100.00) {
      alert('Please enter a valid price between $3.99 and $100.00')
      return
    }

    try {
      const supabase = createSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        const result = await saveSubscriptionPrice(session.user.id, price)
        
        if (result.success) {
          console.log('Subscription price saved:', price)
          setShowSubscriptionPrice(false)
          setShowPlans(true)
        } else {
          alert(result.error || 'Failed to save subscription price')
        }
      }
    } catch (error: any) {
      console.error('Failed to save subscription price:', error)
      alert('Failed to save subscription price. Please try again.')
    }
  }

  const handleSubscriptionPriceSkip = () => {
    setShowSubscriptionPrice(false)
    setShowPlans(true)
    console.log('Skipped subscription price')
  }

  const handlePlanSelect = (plan: 'monthly' | 'annual') => {
    setSelectedPlan(plan)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handlePlanContinue = (plan?: 'monthly' | 'annual') => {
    const planToUse = plan || selectedPlan
    if (planToUse) {
      if (plan) {
        setSelectedPlan(plan)
      }
      setShowPaymentModal(true)
    }
  }

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false)
  }

  const handleContinueToCheckout = async () => {
    if (!selectedPlan) return

    try {
      // Get current user
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Please log in to continue')
        return
      }

      // Create checkout session
      const response = await fetch('/api/creator-subscription-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan,
          userId: user.id,
          userEmail: user.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      alert(error.message || 'Failed to proceed to checkout. Please try again.')
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

  // Payment Modal Component (will be rendered inside plans page)
  const renderPaymentModal = () => {
    if (!showPaymentModal || !selectedPlan) return null

    const planName = selectedPlan === 'annual' ? 'Creator Annual Plan' : 'Creator Monthly Plan'
    const planPrice = selectedPlan === 'annual' ? '6.66' : '19.99'
    const originalPrice = selectedPlan === 'annual' ? '29.99' : null
    const savings = selectedPlan === 'annual' ? '70%' : null
    const subscriptionType = selectedPlan === 'annual' ? 'Annual subscription' : 'Monthly subscription'
    const dollarAmount = selectedPlan === 'annual' ? '$6.66' : '$19.99'

    return (
      <div className="payment-modal-overlay">
        <div className="payment-modal">
          <div className="payment-modal-header">
            <div>
              <h2 className="payment-modal-title">Complete Your Purchase</h2>
              <p className="payment-modal-subtitle">{planName} - ${planPrice}/month</p>
            </div>
            <button className="payment-modal-close" onClick={handleClosePaymentModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="payment-modal-content">
            <div className="payment-plan-section">
              <h3 className="payment-plan-name">{planName}</h3>
              <p className="payment-subscription-type">{subscriptionType}</p>
              <div className="payment-plan-pricing">
                <div className={`payment-plan-left ${!originalPrice ? 'payment-plan-left-empty' : ''}`}>
                  {originalPrice && (
                    <>
                      <span className="payment-original-price">${originalPrice}</span>
                      <span className="payment-savings-badge">SAVE {savings}</span>
                    </>
                  )}
                </div>
                <div className="payment-plan-right">
                  <div className="payment-price-display">
                    <span className="payment-dollar-amount">{dollarAmount}</span>
                    <span className="payment-period">per month</span>
                  </div>
                </div>
              </div>
              <ul className="payment-plan-features">
                <li className="payment-feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Instant weekly payouts</span>
                </li>
                <li className="payment-feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Personal checkout links</span>
                </li>
                <li className="payment-feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>AI Analytics Dashboard</span>
                </li>
                <li className="payment-feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>AI Smart Messaging – auto-reply + upsell assistant</span>
                </li>
                <li className="payment-feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Unlimited custom tip menus</span>
                </li>
              </ul>
            </div>

            <div className="payment-method-section">
              <h3 className="payment-method-title">Payment Method</h3>
              <div className="payment-method-card">
                <div className="payment-method-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M2 10H22" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="7" cy="14" r="1" fill="currentColor"/>
                    <circle cx="10" cy="14" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <div className="payment-method-info">
                  <div className="payment-method-name">Credit Card / PayPal</div>
                  <div className="payment-method-description">Secure payment via credit card, debit card, or PayPal</div>
                </div>
              </div>
              <ul className="payment-method-features">
                <li className="payment-feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Instant activation</span>
                </li>
                <li className="payment-feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Visa, Mastercard, AmEx, Discover, PayPal</span>
                </li>
                <li className="payment-feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Secure & encrypted</span>
                </li>
              </ul>
            </div>
          </div>

          <button className="payment-checkout-btn" onClick={handleContinueToCheckout}>
            Continue to Checkout
          </button>

          <div className="payment-modal-footer">
            <p className="payment-footer-text">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show plans page
  if (showPlans) {
    return (
      <div className="onboarding-page onboarding-page-creator-type onboarding-page-plans">
        <div className="creator-type-container">
          {/* Header with progress */}
          <div className="creator-type-header">
            <button
              className="creator-type-back-btn"
              onClick={() => {
                setShowPlans(false)
                setShowSubscriptionPrice(true)
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
            <div className="creator-type-title">Choose your plan</div>
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
                className={`progress-dot ${index === 4 ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="creator-type-content plans-content">
            <h1 className="creator-type-heading">Choose your plan</h1>
            <p className="creator-type-description">
              Select the plan that works best for you. You can change or cancel anytime.
            </p>

            {/* Plan cards */}
            <div className="plans-cards">
              <div className="plan-card plan-card-annual">
                <div className="plan-header">
                  <h3 className="plan-title">Creator Annual Plan</h3>
                  <div className="plan-price">
                    <span className="plan-amount">$6.66</span>
                    <span className="plan-period">/month</span>
                  </div>
                  <div className="plan-savings">
                    <span className="plan-original-price">$29.99</span>
                    <span className="plan-savings-badge">SAVE 70%</span>
                  </div>
                </div>
                <div className="plan-offer">
                  <span className="plan-offer-emoji">🔥</span>
                  <span className="plan-offer-text">Offer ends in {formatTime(timeRemaining)}</span>
                </div>
                <ul className="plan-features">
                  <li className="plan-feature">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Instant weekly payouts</span>
                  </li>
                  <li className="plan-feature">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Personal checkout links</span>
                  </li>
                  <li className="plan-feature">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>AI Analytics Dashboard</span>
                  </li>
                  <li className="plan-feature">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>AI Smart Messaging – auto-reply + upsell assistant</span>
                  </li>
                  <li className="plan-feature">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Unlimited custom tip menus</span>
                  </li>
                </ul>
                <button
                  className="plan-cta-button"
                  onClick={() => {
                    handlePlanContinue('annual')
                  }}
                >
                  Get Started
                </button>
              </div>

              <div className="plan-card plan-card-monthly">
                <div className="plan-header">
                  <h3 className="plan-title">Creator Monthly Plan</h3>
                  <div className="plan-price">
                    <span className="plan-amount">$19.99</span>
                    <span className="plan-period">/month</span>
                  </div>
                </div>
                <ul className="plan-features plan-features-monthly">
                  <li className="plan-feature">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Instant weekly payouts</span>
                  </li>
                  <li className="plan-feature">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Personal checkout links</span>
                  </li>
                  <li className="plan-feature">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>AI Analytics Dashboard</span>
                  </li>
                  <li className="plan-feature">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>AI Smart Messaging – auto-reply + upsell assistant</span>
                  </li>
                  <li className="plan-feature">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#00d26a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Unlimited custom tip menus</span>
                  </li>
                </ul>
                <button
                  className="plan-cta-button plan-cta-button-monthly"
                  onClick={() => {
                    handlePlanContinue('monthly')
                  }}
                >
                  Select
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Payment Modal - rendered as overlay on top of plans page */}
        {renderPaymentModal()}
      </div>
    )
  }

  // Show subscription price page
  if (showSubscriptionPrice) {
    return (
      <div className="onboarding-page onboarding-page-creator-type">
        <div className="creator-type-container">
          {/* Header with progress */}
          <div className="creator-type-header">
            <button
              className="creator-type-back-btn"
              onClick={() => {
                setShowSubscriptionPrice(false)
                setShowDisplayName(true)
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
            <div className="creator-type-title">Subscription price</div>
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
                className={`progress-dot ${index === 3 ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="creator-type-content display-name-content">
            <h1 className="creator-type-heading display-name-heading">Set your subscription price</h1>
            <p className="creator-type-description">
              Set your monthly Subscription price for fans, don&apos;t worry you will be able to change this later.
            </p>

            {/* Form fields */}
            <div className="display-name-form subscription-price-form">
              <div className="form-field-group">
                <div className="subscription-price-input-wrapper">
                  <span className="subscription-price-prefix">$</span>
                  <input
                    type="number"
                    id="subscription-price"
                    className="form-field-input subscription-price-input"
                    value={subscriptionPrice}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty, or valid number
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setSubscriptionPrice(value)
                      }
                    }}
                    placeholder="9.99"
                    min="3.99"
                    max="100.00"
                    step="0.01"
                  />
                </div>
                <p className="form-field-helper">Minimum $3.99. Maximum $100.00.</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="display-name-actions subscription-price-actions">
              <button
                className="creator-type-continue-btn"
                onClick={handleSubscriptionPriceContinue}
                disabled={!subscriptionPrice || parseFloat(subscriptionPrice) < 3.99 || parseFloat(subscriptionPrice) > 100.00}
              >
                Continue
              </button>
              <button
                className="display-name-skip-btn"
                onClick={handleSubscriptionPriceSkip}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    )
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
            {[0, 1, 2, 3, 4].map((index) => (
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
            {[0, 1, 2, 3, 4].map((index) => (
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

  // Show welcome page
  if (showWelcomePage) {
    return (
      <div className="onboarding-page welcome-page">
        <div className="welcome-container">
          {/* Logo */}
          <div className="welcome-logo">
            <Image
              src="/logo.png"
              alt="Fanrae"
              width={200}
              height={0}
              style={{ height: 'auto', width: '200px' }}
              priority
            />
          </div>

          {/* Header */}
          <h1 className="welcome-heading">Welcome to Fanrae</h1>
          <p className="welcome-subheading">Let&apos;s get you started</p>

          {/* Options */}
          <div className="welcome-options">
            <button
              className="welcome-option-button"
              onClick={() => {
                router.push('/fan-setup')
              }}
            >
              Discover creators
            </button>

            <button
              className="welcome-option-button"
              onClick={() => {
                setShowWelcomePage(false)
              }}
            >
              Become a Creator
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

