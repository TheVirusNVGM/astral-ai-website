'use client'

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
      image: "/5.png"
    }
  ]

  return (
    <section className="relative py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="relative overflow-hidden group h-full">
              <div className="glass card p-8 h-full flex flex-col hover:border-white/30 transition-all duration-300">
                
                {/* Image or icon area */}
                <div className="w-full py-8 mb-6 bg-gradient-to-r from-cosmic-purple-200/15 to-cosmic-blue-100/15 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden relative">
                  {feature.image ? (
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-auto h-64 object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-6xl group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                  )}
                </div>
                
                {/* Badge */}
                <div className="badge mb-4 shadow-lg">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  {feature.highlight}
                </div>
                
                {/* Content */}
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-gradient transition-all duration-300">
                  {feature.title}
                </h3>
                <p className="text-white/75 leading-relaxed flex-1">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
