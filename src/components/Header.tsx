'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/lib/AuthContext'
import AuthModal from './AuthModal'

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { user, loading, signOut } = useAuth()

  const handleGetStarted = () => {
    if (!user) {
      setIsAuthModalOpen(true)
    }
  }

  return (
    <>
      <header className="relative z-50 border-b border-white/10 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden animate-glow-pulse">
                <Image
                  src="/logo.png"
                  alt="ASTRAL-AI Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ASTRAL-AI</h1>
                <p className="text-xs text-cosmic-purple-50/80">Minecraft Launcher</p>
              </div>
            </div>
            <nav className="flex items-center space-x-8">
              {loading ? (
                <div className="w-8 h-8 border-2 border-cosmic-purple-200 border-t-transparent rounded-full animate-spin" />
              ) : user ? (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-white font-semibold">{user.name}</p>
                    <p className="text-cosmic-purple-100 text-sm capitalize">{user.subscription_tier}</p>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all duration-300"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleGetStarted}
                  className="px-6 py-2 bg-cosmic-purple-200 hover:bg-cosmic-purple-100 text-white rounded-lg font-semibold transition-all duration-300"
                >
                  Get Started
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  )
}
