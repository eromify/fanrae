'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function RefreshPage() {
  const params = useParams()
  const connectedAccountId = params.connectedAccountId as string
  const [accountLinkCreatePending, setAccountLinkCreatePending] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (connectedAccountId) {
      setAccountLinkCreatePending(true)
      fetch('/api/account_link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account: connectedAccountId,
        }),
      })
        .then((response) => response.json())
        .then((json) => {
          setAccountLinkCreatePending(false)
          const { url, error } = json
          if (url) {
            window.location.href = url
          }
          if (error) {
            setError(true)
          }
        })
    }
  }, [connectedAccountId])

  return (
    <div className="container">
      <div className="banner">
        <h2>Fanrae</h2>
      </div>
      <div className="content">
        <h2>Add information to start accepting money</h2>
        <p>
          Complete your Stripe onboarding to start receiving payouts from your
          content sales on Fanrae.
        </p>
        {error && <p className="error">Something went wrong!</p>}
      </div>
      <div className="dev-callout">
        {connectedAccountId && (
          <p>
            Your connected account ID is:{' '}
            <code className="bold">{connectedAccountId}</code>
          </p>
        )}
        {accountLinkCreatePending && <p>Creating a new Account Link...</p>}
      </div>
    </div>
  )
}

