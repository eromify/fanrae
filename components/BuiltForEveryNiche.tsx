'use client'

import Link from 'next/link'

export default function BuiltForEveryNiche() {
  return (
    <section className="built-for-section">
      <div className="built-for-content">
        <h2 className="built-for-header">
          Built for every niche.<br />
          Trusted by icons.
        </h2>
        <p className="built-for-subheader">
          Join <span className="green-text">20,000+ creators</span> scaling<br />
          their success with Fanrae
        </p>
        <Link href="/signup" className="btn-join-movement">Join the movement</Link>
      </div>
    </section>
  )
}

