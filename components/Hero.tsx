'use client'

export default function Hero() {
  return (
    <>
      <section className="hero-section">
        <video
          className="hero-video"
          autoPlay
          loop
          muted
          playsInline
          src="/videos/hero.mp4"
        >
          Your browser does not support the video tag.
        </video>
      </section>
      <div className="hero-content">
        <h1 className="hero-headline">
          Earn from your fanbase faster with the No.1 AI monetisation platform for creators.
        </h1>
        <div className="hero-buttons">
          <button className="btn-hero-primary">Become a creator</button>
          <button className="btn-hero-secondary">Sign up as a fan</button>
        </div>
      </div>
    </>
  )
}

