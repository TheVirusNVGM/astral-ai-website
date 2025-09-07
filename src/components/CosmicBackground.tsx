'use client'

import { useEffect, useState } from 'react'

interface Star {
  id: number
  x: number
  y: number
  size: 'small' | 'medium' | 'large'
  delay: number
}

interface Particle {
  id: number
  x: number
  delay: number
}

interface Nebula {
  id: number
  x: number
  y: number
  size: number
  type: 'purple' | 'blue'
  delay: number
}

export default function CosmicBackground() {
  const [stars, setStars] = useState<Star[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [nebulas, setNebulas] = useState<Nebula[]>([])

  useEffect(() => {
    // Generate stars
    const starArray: Star[] = []
    for (let i = 0; i < 80; i++) {
      starArray.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() > 0.7 ? 'large' : Math.random() > 0.4 ? 'medium' : 'small',
        delay: Math.random() * 4
      })
    }
    
    // Generate bright stars
    for (let i = 80; i < 95; i++) {
      starArray.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 'large',
        delay: Math.random() * 6
      })
    }
    
    setStars(starArray)

    // Generate particles
    const particleArray: Particle[] = []
    for (let i = 0; i < 20; i++) {
      particleArray.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 15
      })
    }
    setParticles(particleArray)

    // Generate nebulas
    const nebulaArray: Nebula[] = []
    for (let i = 0; i < 8; i++) {
      nebulaArray.push({
        id: i,
        x: Math.random() * 120 - 10, // -10 to 110 for overflow
        y: Math.random() * 120 - 10,
        size: 150 + Math.random() * 300,
        type: Math.random() > 0.7 ? 'blue' : 'purple',
        delay: Math.random() * 25
      })
    }
    setNebulas(nebulaArray)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Base cosmic background with gradient glow */}
      <div 
        className="absolute inset-0 bg-cosmic"
        style={{
          background: `
            radial-gradient(ellipse at 80% 80%, 
              rgba(58, 0, 158, 0.56) 0%,
              rgba(68, 19, 182, 0.23) 25%,
              rgba(39, 17, 90, 0.37) 50%,
              transparent 100%
            ),
            #03010f
          `
        }}
      />

      {/* Stars layer */}
      <div className="absolute inset-0">
        {stars.map((star) => {
          const isBright = star.id >= 80
          return (
            <div
              key={star.id}
              className={`absolute rounded-full ${
                isBright 
                  ? 'w-0.5 h-0.5 bg-cosmic-purple-50 shadow-[0_0_8px_rgba(168,85,247,1),0_0_16px_rgba(139,92,246,0.9),0_0_24px_rgba(124,58,237,0.7),0_0_32px_rgba(168,85,247,0.5)] animate-bright-twinkle' 
                  : star.size === 'large'
                  ? 'w-0.5 h-0.5 bg-cosmic-purple-50 shadow-[0_0_5px_rgba(168,85,247,1),0_0_10px_rgba(139,92,246,1),0_0_15px_rgba(124,58,237,0.8)] animate-twinkle'
                  : star.size === 'medium'
                  ? 'w-px h-px bg-cosmic-purple-50 shadow-[0_0_4px_rgba(168,85,247,1),0_0_8px_rgba(139,92,246,0.9),0_0_12px_rgba(124,58,237,0.7)] animate-twinkle'
                  : 'w-px h-px bg-cosmic-purple-50 shadow-[0_0_3px_rgba(168,85,247,1),0_0_6px_rgba(139,92,246,0.8),0_0_9px_rgba(124,58,237,0.6)] animate-twinkle'
              }`}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                animationDelay: `${star.delay}s`
              }}
            />
          )
        })}
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-px h-px bg-cosmic-purple-200/60 rounded-full animate-float-particle"
            style={{
              left: `${particle.x}%`,
              animationDelay: `${particle.delay}s`
            }}
          />
        ))}
      </div>

      {/* Nebulas */}
      <div className="absolute inset-0">
        {nebulas.map((nebula) => (
          <div
            key={nebula.id}
            className={`absolute rounded-full animate-nebula-drift ${
              nebula.type === 'blue' 
                ? 'bg-gradient-radial from-cosmic-blue-100/10 to-transparent'
                : 'bg-gradient-radial from-cosmic-purple-200/15 to-transparent'
            }`}
            style={{
              left: `${nebula.x}%`,
              top: `${nebula.y}%`,
              width: `${nebula.size}px`,
              height: `${nebula.size}px`,
              filter: 'blur(30px)',
              animationDelay: `${nebula.delay}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}
