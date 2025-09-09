export default function FeaturesSection() {
  const features = [
    {
      title: "AI Recommendations",
      description: "Smart suggestions tailored to your playstyle",
      icon: "🧠",
      highlight: "Smart AI"
    },
    {
      title: "Conflict Detection", 
      description: "Instantly identify & resolve mod conflicts",
      icon: "⚠️",
      highlight: "Auto-Fix"
    },
    {
      title: "Visual Management",
      description: "Drag, drop & organize with an intuitive interface",
      icon: "🎛️",
      highlight: "Easy UI"
    }
  ]

  return (
    <section className="relative py-24">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-8 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 group">
              <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <div className="px-3 py-1 bg-cosmic-purple-200 text-white text-xs font-semibold rounded-full inline-block mb-4">
                {feature.highlight}
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
              <p className="text-white/70">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
