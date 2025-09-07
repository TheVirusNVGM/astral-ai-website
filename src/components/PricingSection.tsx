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
      features: ["Everything in Free", "AI Smart Sorting", "Dr. Crash Analysis", "Priority Support"],
      popular: true
    },
    {
      name: "Pro",
      price: "$19.99",
      period: "month", 
      features: ["Everything in Premium", "Unlimited AI Features", "API Access", "1-on-1 Support"],
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`relative p-8 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm ${plan.popular ? 'ring-2 ring-cosmic-purple-200' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="px-4 py-2 bg-cosmic-purple-200 text-white text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                </div>
              )}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-4xl font-bold text-cosmic-purple-100">{plan.price}</span>
                  <span className="text-white/70 ml-2">/{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-white/80">
                    <span className="text-cosmic-purple-100 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${plan.popular ? 'bg-cosmic-purple-200 hover:bg-cosmic-purple-100 text-white' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'}`}>
                {plan.name === 'Free' ? 'Download Free' : `Start ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
