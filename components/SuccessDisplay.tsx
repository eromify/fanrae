'use client'

import Logo from './Logo'
import { useState } from 'react'

interface SuccessDisplayProps {
  sessionId: string
}

const SuccessDisplay = ({ sessionId }: SuccessDisplayProps) => {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to create portal session')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="product Box-root">
        <Logo />
        <div className="description Box-root">
          <h3>Subscription to Starter Plan successful!</h3>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="hidden"
          id="session-id"
          name="session_id"
          value={sessionId}
        />
        <button 
          id="checkout-and-portal-button" 
          type="submit"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Manage your billing information'}
        </button>
      </form>
    </section>
  )
}

export default SuccessDisplay


