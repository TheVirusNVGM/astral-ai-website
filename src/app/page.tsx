import CosmicBackground from '@/components/CosmicBackground'
import Header from '@/components/Header'
import HeroSection from '@/components/HeroSection'
import FeaturesSection from '@/components/FeaturesSection'
import PricingSection from '@/components/PricingSection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-cosmic font-inter">
      {/* Cosmic background with stars and particles */}
      <CosmicBackground />
      
      {/* Main content */}
      <div className="relative z-10">
        <Header />
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <Footer />
      </div>
    </main>
  )
}
