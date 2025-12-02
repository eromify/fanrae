import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Features from '@/components/Features'

export default function Home() {
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <Features />
      <main className="landing-content">
        {/* Content will be added here */}
      </main>
    </div>
  )
}
