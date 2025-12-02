import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import CreatorEconomy from '@/components/CreatorEconomy'
import BuiltForEveryNiche from '@/components/BuiltForEveryNiche'

export default function Home() {
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <Features />
      <CreatorEconomy />
      <BuiltForEveryNiche />
    </div>
  )
}
