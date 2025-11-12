'use client'

export default function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: ["Visual Mod Board", "Multi-Loader Support", "Basic Mod Search"],
      popular: false
    },
    {
      name: "Premium", 
      price: "$9.99",
      period: "month",
      features: ["Everything in Free", "AI Smart Sorting", "AI Builder Access", "Priority Support"],
      popular: true
    },
    {
      name: "Pro",
      price: "$19.99",
      period: "month", 
      features: ["Everything in Premium", "Unlimited AI Features", "AI Builder Access", "1-on-1 Support"],
      popular: false
    }
  ]

  return (
    <section className="relative py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Choose Your Plan
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Start free and upgrade when you need more power
          </p>
        </div>
        <div className="relative pricing-container grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch" style={{ minHeight: '500px', perspective: '1200px', overflow: 'hidden' }}>
          {/* Hazard tape overlays - wrapping around cards seamlessly */}
          {/* Tapes behind cards (z-index: 5) */}
          <div className="hazard-tape hazard-tape-behind" style={{ top: '5%', left: '-25%', transform: 'rotate(-30deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-behind" style={{ top: '18%', left: '-25%', transform: 'rotate(20deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-behind" style={{ top: '32%', left: '-25%', transform: 'rotate(-28deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-behind" style={{ top: '48%', left: '-25%', transform: 'rotate(22deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-behind" style={{ top: '62%', left: '-25%', transform: 'rotate(-26deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-behind" style={{ top: '78%', left: '-25%', transform: 'rotate(18deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-behind" style={{ top: '10%', right: '-25%', transform: 'rotate(30deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-behind" style={{ top: '25%', right: '-25%', transform: 'rotate(-24deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-behind" style={{ top: '40%', right: '-25%', transform: 'rotate(26deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-behind" style={{ top: '55%', right: '-25%', transform: 'rotate(-20deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-behind" style={{ top: '70%', right: '-25%', transform: 'rotate(24deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-behind" style={{ top: '85%', right: '-25%', transform: 'rotate(-22deg) translateZ(0)' }} />
          
          {/* Tapes in front of cards (z-index: 15) */}
          <div className="hazard-tape hazard-tape-front" style={{ top: '12%', left: '-25%', transform: 'rotate(-25deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-front" style={{ top: '28%', left: '-25%', transform: 'rotate(24deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-front" style={{ top: '45%', left: '-25%', transform: 'rotate(-30deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-front" style={{ top: '60%', left: '-25%', transform: 'rotate(19deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-front" style={{ top: '75%', left: '-25%', transform: 'rotate(-27deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-front" style={{ top: '15%', right: '-25%', transform: 'rotate(27deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-front" style={{ top: '32%', right: '-25%', transform: 'rotate(-23deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-front" style={{ top: '50%', right: '-25%', transform: 'rotate(25deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-front" style={{ top: '65%', right: '-25%', transform: 'rotate(-21deg) translateZ(0)' }} />
          <div className="hazard-tape hazard-tape-front" style={{ top: '80%', right: '-25%', transform: 'rotate(23deg) translateZ(0)' }} />
          
          {/* Test Only sign - centered over the pricing cards */}
          <div className="test-only-sign" style={{ top: '45%' }}>
            TEST ONLY
          </div>

          {plans.map((plan, index) => (
            <div
              key={index}
              role="button"
              tabIndex={0}
              aria-label={`Select ${plan.name} plan`}
              className={`relative p-8 rounded-2xl glass card cursor-pointer group transition-all duration-300 focus:outline-none 
                border border-white/10 hover:border-white/30 
                flex flex-col h-full
              `}
              style={{ zIndex: 10 }}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="badge shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cosmic-purple-100 transition-colors">{plan.name}</h3>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-4xl font-bold text-gradient">{plan.price}</span>
                  <span className="text-white/70 ml-2">/{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-white/80">
                    <span className="text-cosmic-purple-100 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                aria-label={`CTA ${plan.name}`}
                onClick={() => void 0}
                className={`w-full btn ${plan.popular ? 'btn-primary btn-cta' : 'btn-outline btn-cta-secondary'} btn-lg mt-auto`}
              >
                {plan.name === 'Free' ? 'Download Free' : `Start ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
