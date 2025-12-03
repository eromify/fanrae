'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import CreatorEconomy from '@/components/CreatorEconomy'
import BuiltForEveryNiche from '@/components/BuiltForEveryNiche'
import { createSupabaseClient } from '@/lib/supabase/client'
import { checkCreatorStatus } from '@/lib/supabase/creator'

export default function Home() {
  const router = useRouter()
  const [isHandlingAuth, setIsHandlingAuth] = useState(false)

  useEffect(() => {
    // Check if this is an OAuth callback (has access_token in hash)
    const handleAuthCallback = async () => {
      // Check if URL has hash with access_token (OAuth callback)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const expiresIn = hashParams.get('expires_in')
        const tokenType = hashParams.get('token_type') || 'bearer'

        if (accessToken && refreshToken) {
          setIsHandlingAuth(true)
          try {
            const supabase = createSupabaseClient()
            
            // Set the session explicitly from the OAuth callback tokens
            const { data: { session }, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (error) {
              console.error('Error setting session:', error)
              setIsHandlingAuth(false)
              // Clear the hash and stay on landing page
              window.history.replaceState(null, '', window.location.pathname)
              return
            }

            if (session?.user) {
              // Clear the hash from URL
              window.history.replaceState(null, '', window.location.pathname)
              
              // Check user status and redirect accordingly
              const creatorStatus = await checkCreatorStatus(session.user.id)
              
              if (creatorStatus.isCreator && creatorStatus.hasPaid) {
                // Creator has paid - redirect to creator app
                router.push('/creator/home')
                return
              }

              // Check if user_type is creator (even if no subscription yet)
              const { data: profile } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', session.user.id)
                .single()

              if (profile?.user_type === 'creator') {
                // Check again for active subscription
                const { data: creator } = await supabase
                  .from('creators')
                  .select('id')
                  .eq('user_id', session.user.id)
                  .single()

                if (creator) {
                  const { data: subscription } = await supabase
                    .from('creator_subscriptions')
                    .select('status')
                    .eq('creator_id', creator.id)
                    .eq('status', 'active')
                    .maybeSingle()

                  if (subscription) {
                    // Has active subscription - redirect to creator app
                    router.push('/creator/home')
                    return
                  }
                }
              }

              // Check if user is a fan (has fan profile)
              if (profile?.user_type === 'fan') {
                // Fan user - redirect to fan home
                router.push('/fan/home')
                return
              }

              // New user or no type set - redirect to onboarding
              router.push('/onboarding')
            } else {
              setIsHandlingAuth(false)
              // Clear the hash and stay on landing page
              window.history.replaceState(null, '', window.location.pathname)
            }
          } catch (error) {
            console.error('Error handling auth callback:', error)
            setIsHandlingAuth(false)
            // Clear the hash and stay on landing page
            window.history.replaceState(null, '', window.location.pathname)
          }
        }
      }
    }

    handleAuthCallback()
  }, [router])

  // Show loading state while handling auth
  if (isHandlingAuth) {
    return (
      <div className="landing-page">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          fontSize: '18px'
        }}>
          Signing you in...
        </div>
      </div>
    )
  }

  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <Features />
      <CreatorEconomy />
      <BuiltForEveryNiche />
    </div>
  )
}
