export default function HeroSection() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="container mx-auto px-6 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
          The Future of
          <span className="block bg-gradient-to-r from-cosmic-purple-100 to-cosmic-blue-100 bg-clip-text text-transparent">
            Minecraft Modding
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
          Visual mod management like never before. Organize, discover, and optimize your Minecraft experience 
          with AI-powered recommendations and conflict detection.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <button className="px-8 py-4 bg-cosmic-purple-200 hover:bg-cosmic-purple-100 text-white text-lg font-semibold rounded-xl transition-all duration-300 hover:scale-105">
            Download Free
          </button>
          <button className="px-8 py-4 border border-cosmic-purple-200/50 hover:bg-cosmic-purple-200/10 text-white text-lg font-semibold rounded-xl transition-all duration-300 backdrop-blur-sm">
            Watch Demo
          </button>
        </div>
      </div>
    </section>
  )
}
