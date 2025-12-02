'use client'

export default function Features() {
  const features = [
    {
      video: '/videos/section2 1.mp4',
      title: 'Payments, Payouts and Checkout Links',
      description: 'Monetise what you create, get paid faster than ever.',
    },
    {
      video: '/videos/section2 2.mp4',
      title: 'AI Analytics & Earning Insights',
      description: 'Get crystal-clear clarity on your fans and earnings.',
    },
    {
      video: '/videos/section2 3.mp4',
      title: 'Monthly Subscriptions & Paywalled Content',
      description: 'Build recurring income on your terms.',
    },
    {
      video: '/videos/section2 4.mp4',
      title: 'AI Voice Calls',
      description: "Speak to every fan like they're the only one.",
    },
  ]

  return (
    <section className="features-section">
      <h2 className="features-heading">Features</h2>
      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-item">
            <video
              className="feature-video"
              autoPlay
              loop
              muted
              playsInline
              src={feature.video}
            >
              Your browser does not support the video tag.
            </video>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

