import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-lg overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="ASTRAL-AI Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">ASTRAL-AI</h3>
                <p className="text-xs text-cosmic-purple-50/80">Minecraft Launcher</p>
              </div>
            </div>
            <p className="text-white/70 mb-6">
              The future of Minecraft mod management. Visual, intelligent, and powerful.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Product</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-white/70 hover:text-cosmic-purple-100 transition-colors">Features</a></li>
              <li><a href="#" className="text-white/70 hover:text-cosmic-purple-100 transition-colors">Pricing</a></li>
              <li><a href="#" className="text-white/70 hover:text-cosmic-purple-100 transition-colors">Download</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Support</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-white/70 hover:text-cosmic-purple-100 transition-colors">Documentation</a></li>
              <li><a href="#" className="text-white/70 hover:text-cosmic-purple-100 transition-colors">Community</a></li>
              <li><a href="#" className="text-white/70 hover:text-cosmic-purple-100 transition-colors">Discord</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-white/70 hover:text-cosmic-purple-100 transition-colors">About</a></li>
              <li><a href="#" className="text-white/70 hover:text-cosmic-purple-100 transition-colors">Privacy</a></li>
              <li><a href="#" className="text-white/70 hover:text-cosmic-purple-100 transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-white/60 text-sm">
            © 2025 ASTRAL-AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
