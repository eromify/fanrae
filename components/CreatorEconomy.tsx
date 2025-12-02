'use client'

export default function CreatorEconomy() {
  return (
    <section className="creator-economy-section">
      <div className="creator-economy-content">
        <h2 className="creator-economy-header">
          The Creator-AI Economy has arrived, and Fanrae hands you the tools to lead it.
        </h2>
        <p className="creator-economy-subheader">
          We&apos;re powering the next era of independent success for all creators.
        </p>
        <button className="btn-join-movement">Join the movement</button>
      </div>
      <video
        className="creator-economy-video"
        autoPlay
        loop
        muted
        playsInline
        src="/videos/section3 1.mp4"
      >
        Your browser does not support the video tag.
      </video>
    </section>
  )
}

