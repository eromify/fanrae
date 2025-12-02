import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'

export default function Home() {
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <main className="landing-content">
        {/* Content will be added here */}
      </main>
    </div>
  )
}
