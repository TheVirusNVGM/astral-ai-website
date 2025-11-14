'use client'

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    note: "For explorers who want to feel the chaos without paying a credit card tax.",
    features: [
      "Visual Mod Atlas",
      "Multi-loader ready",
      "Basic mod search",
      "Manual builder prompts"
    ],
    highlight: false
  },
  {
    name: "Premium", 
    price: "$9.99",
    period: "month",
    note: "Unlock the AI Builder, smart sorting, and support that actually replies.",
    features: [
      "Everything in Free",
      "AI Builder Access",
      "Smart auto-sorting",
      "Priority human support"
    ],
    highlight: true
  },
  {
    name: "Pro",
    price: "$19.99",
    period: "month", 
    note: "Bring the whole studio. Unlimited AI features and white-glove assistance.",
    features: [
      "Everything in Premium",
      "Unlimited AI prompts",
      "Private launcher themes",
      "1-on-1 concierge"
    ],
    highlight: false
  }
]

const hazardTapes = [
  { className: 'hazard-tape hazard-tape-front', style: { top: '8%', left: '-25%', transform: 'rotate(-28deg)', zIndex: 60 } },
  { className: 'hazard-tape hazard-tape-front', style: { top: '25%', left: '-20%', transform: 'rotate(20deg)', zIndex: 60 } },
  { className: 'hazard-tape hazard-tape-front', style: { top: '45%', left: '-18%', transform: 'rotate(-24deg)', zIndex: 60 } },
  { className: 'hazard-tape hazard-tape-front', style: { top: '12%', right: '-25%', transform: 'rotate(30deg)', zIndex: 60 } },
  { className: 'hazard-tape hazard-tape-front', style: { top: '32%', right: '-22%', transform: 'rotate(-26deg)', zIndex: 60 } },
  { className: 'hazard-tape hazard-tape-front', style: { top: '18%', left: '-22%', transform: 'rotate(-22deg)', zIndex: 60 } },
  { className: 'hazard-tape hazard-tape-front', style: { top: '38%', left: '-18%', transform: 'rotate(24deg)', zIndex: 60 } },
  { className: 'hazard-tape hazard-tape-front', style: { top: '58%', left: '-20%', transform: 'rotate(-20deg)', zIndex: 60 } },
  { className: 'hazard-tape hazard-tape-front', style: { top: '20%', right: '-24%', transform: 'rotate(26deg)', zIndex: 60 } },
  { className: 'hazard-tape hazard-tape-front', style: { top: '48%', right: '-20%', transform: 'rotate(-24deg)', zIndex: 60 } },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="relative py-28 bg-neo-black text-neo-white border-t-8 border-b-8 border-neo-orange overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
          <div>
            <p className="text-xs uppercase tracking-[0.5em]">Test Laboratory</p>
            <h2 className="mt-4 font-display text-[clamp(2.5rem,5vw,4.5rem)] uppercase leading-none">
              Pick a plan and wrap it in hazard tape
            </h2>
          </div>
          <p className="text-base md:text-lg text-white/80 max-w-xl">
            We&apos;re still calling this a TEST ONLY program, but the ribbons are here,
            the AI builder is alive, and the launcher is hungry for experiments.
          </p>
        </div>

        <div className="relative pricing-container grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {hazardTapes.map((tape, idx) => (
            <div key={idx} className={tape.className} style={tape.style} />
          ))}

          <div className="test-only-sign" style={{ zIndex: 70 }}>TEST ONLY</div>

          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative border-4 border-neo-black bg-neo-white text-neo-black rounded-[32px] p-8 shadow-neo flex flex-col clip-corner ${
                plan.highlight ? 'bg-neo-accent/40' : ''
              }`}
              style={{ zIndex: 50 }}
            >
              {plan.highlight && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                  <div className="neo-tag text-[0.6rem]">MOST LOVED</div>
                </div>
              )}

              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.4em]">{plan.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl">{plan.price}</span>
                  <span className="text-sm uppercase tracking-[0.3em]">/{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-neo-black/70">
                  {plan.note}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <span className="w-2 h-2 bg-neo-black rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`btn btn-lg w-full ${plan.highlight ? 'btn-primary' : 'btn-outline'}`}
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
