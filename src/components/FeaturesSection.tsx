export default function FeaturesSection() {
  const features = [
    {
      title: "Visual Mod Board",
      description: "Organize mods with intuitive drag & drop interface",
      highlight: "Revolutionary"
    },
    {
      title: "AI Smart Sorting", 
      description: "Let AI automatically categorize your mod collection",
      highlight: "Coming Soon"
    },
    {
      title: "Dr. Crash AI",
      description: "Advanced crash log analysis with AI-powered solutions",
      highlight: "Premium"
    }
  ]

  return (
    <section className="relative py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Powerful Features
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Everything you need to manage your Minecraft mods efficiently
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-8 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
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
