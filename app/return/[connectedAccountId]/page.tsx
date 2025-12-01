'use client'

import { useParams } from 'next/navigation'

export default function ReturnPage() {
  const params = useParams()
  const connectedAccountId = params.connectedAccountId as string

  return (
    <div className="container">
      <div className="banner">
        <h2>Fanrae</h2>
      </div>
      <div className="content">
        <h2>Details submitted</h2>
        <p>That&apos;s everything we need for now</p>
      </div>
      <div className="info-callout">
        <p>
          This is a sample app for Stripe-hosted Connect onboarding.{' '}
          <a
            href="https://docs.stripe.com/connect/onboarding/quickstart?connect-onboarding-surface=hosted"
            target="_blank"
            rel="noopener noreferrer"
          >
            View docs
          </a>
        </p>
      </div>
    </div>
  )
}

