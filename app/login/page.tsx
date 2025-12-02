'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase/client'
import { checkCreatorStatus } from '@/lib/supabase/creator'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const supabase = createSupabaseClient()
      const redirectUrl =
        process.env.NEXT_PUBLIC_APP_URL || `${window.location.origin}`
      // Redirect to onboarding - it will check payment status and redirect accordingly
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectUrl}/onboarding`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Check creator status and redirect accordingly
      if (data.session?.user) {
        const creatorStatus = await checkCreatorStatus(data.session.user.id)
        
        if (creatorStatus.isCreator && creatorStatus.hasPaid) {
          // Creator has paid - redirect to app (when it exists)
          // For now, redirect to home
          router.push('/')
        } else if (creatorStatus.isCreator && !creatorStatus.hasPaid) {
          // Creator hasn't paid - redirect to onboarding to complete payment
          router.push('/onboarding')
        } else {
          // Not a creator yet - redirect to onboarding
          router.push('/onboarding')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <Image
            src="/logo.png"
            alt="Fanrae"
            width={200}
            height={0}
            style={{ height: 'auto', width: '200px' }}
            priority
          />
        </div>

        <div className="login-content">
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            className="btn-google"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H15.9564C17.1582 14.7227 17.64 13.2182 17.64 9.20454Z"
                fill="#4285F4"
              />
              <path
                d="M9 18C11.43 18 13.467 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65455 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
                fill="#34A853"
              />
              <path
                d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65455 3.57955 9 3.57955Z"
                fill="#EA4335"
              />
            </svg>
            {isLoading ? 'Loading...' : 'Continue with Google'}
          </button>

          <div className="login-divider">
            <span className="divider-line"></span>
            <span className="divider-text">or</span>
            <span className="divider-line"></span>
          </div>

          <form onSubmit={handleSignIn} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 3.75C5 3.75 1.73 7.31 1 10C1.73 12.69 5 16.25 10 16.25C15 16.25 18.27 12.69 19 10C18.27 7.31 15 3.75 10 3.75ZM10 14.17C7.24 14.17 5 11.93 5 9.17C5 6.41 7.24 4.17 10 4.17C12.76 4.17 15 6.41 15 9.17C15 11.93 12.76 14.17 10 14.17ZM10 5.83C8.34 5.83 7 7.17 7 8.83C7 10.49 8.34 11.83 10 11.83C11.66 11.83 13 10.49 13 8.83C13 7.17 11.66 5.83 10 5.83Z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2.5 2.5L17.5 17.5M8.16 8.16C7.84 8.48 7.5 8.95 7.5 9.58C7.5 10.66 8.34 11.5 9.42 11.5C10.05 11.5 10.52 11.16 10.84 10.84M15.84 12.84C16.58 12.1 17.16 11.13 17.5 10C16.77 7.31 13.5 3.75 8.5 3.75C7.59 3.75 6.75 3.92 6 4.16M5.16 5.16C4.42 5.9 3.84 6.87 3.5 8C4.23 10.69 7.5 14.25 12.5 14.25C13.41 14.25 14.25 14.08 15 13.84"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-signin"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="signup-prompt">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="signup-link">
              Create one now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

