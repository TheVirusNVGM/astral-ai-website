export default function FeaturesSection() {
  const features = [
    {
      title: "AI Recommendations",
      description: "Smart suggestions tailored to your playstyle and gaming preferences",
      icon: "🧠",
      highlight: "Smart AI",
      image: null // Placeholder for future image
    },
    {
      title: "Conflict Detection", 
      description: "Instantly identify and resolve mod conflicts before they break your game",
      icon: "⚠️",
      highlight: "Auto-Fix",
      image: null // Placeholder for future image
    },
    {
      title: "Visual Management",
      description: "Drag, drop and organize mods with an intuitive visual interface",
      icon: "🎛️",
      highlight: "Easy UI",
      image: null // Placeholder for future image
    }
  ]

  return (
    <section className="relative py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="relative overflow-hidden group">
              {/* Feature Card */}
              <div className="p-6 bg-gradient-to-br from-white/15 to-white/5 rounded-2xl border border-white/20 backdrop-blur-xl hover:from-white/25 hover:to-white/10 transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl">
                
                {/* Image placeholder area - will be added later */}
                <div className="w-full py-8 mb-6 bg-gradient-to-r from-cosmic-purple-200/20 to-cosmic-blue-100/20 rounded-xl border border-white/10 flex items-center justify-center">
                  <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                </div>
                
                {/* Badge */}
                <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-cosmic-purple-200 to-cosmic-purple-100 text-white text-xs font-bold rounded-full mb-4 shadow-lg">
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                  {feature.highlight}
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cosmic-purple-100 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {feature.description}
                </p>
                
                {/* Hover effect glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-cosmic-purple-200/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
