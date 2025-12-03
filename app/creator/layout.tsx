'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import AppSidebar from '@/components/AppSidebar'

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userType, setUserType] = useState<'fan' | 'creator' | null>(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isLoading && isAuthenticated && userType === 'creator' && !hasActiveSubscription) {
      // Redirect to onboarding/payment if creator doesn't have active subscription
      router.push('/onboarding')
    }
  }, [isLoading, isAuthenticated, userType, hasActiveSubscription, router])

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

      // Check user type from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single()

      if (profile?.user_type === 'creator') {
        setUserType('creator')

        // Check if creator has an active subscription
        // First, get the creator record
        const { data: creator } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (creator) {
          // Check for active subscription in creator_subscriptions table
          const { data: subscription, error: subError } = await supabase
            .from('creator_subscriptions')
            .select('status')
            .eq('creator_id', creator.id)
            .eq('status', 'active')
            .maybeSingle()

          // If subscription exists and is active, allow access
          if (subscription && !subError) {
            setHasActiveSubscription(true)
          } else {
            setHasActiveSubscription(false)
          }
        } else {
          // No creator record yet, needs onboarding
          setHasActiveSubscription(false)
        }
      } else {
        setUserType('fan')
        // Redirect fans to fan app
        router.push('/fan/home')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || userType !== 'creator' || !hasActiveSubscription) {
    return null
  }

  return (
    <div className="app-container">
      <AppSidebar userType={userType} />
      <main className="app-main">
        {children}
      </main>
    </div>
  )
}

