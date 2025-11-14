'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

interface Star {
  id: number
  x: number
  y: number
  size: 'tiny' | 'small' | 'medium' | 'large'
  delay: number
  bright?: boolean
}

interface ShootingStar {
  id: number
  left: number
  top: number
  delay: number
}

const blobs: { id: number; className: string; style: CSSProperties }[] = [
  { id: 1, className: 'bg-neo-purple/50', style: { top: '5%', left: '-10%', width: '420px', height: '420px' } },
  { id: 2, className: 'bg-neo-blue/40', style: { top: '10%', right: '-15%', width: '520px', height: '520px' } },
  { id: 3, className: 'bg-neo-orange/35', style: { bottom: '-10%', left: '20%', width: '460px', height: '460px' } },
]

export default function CosmicBackground() {
  const [stars, setStars] = useState<Star[]>([])
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([])

  useEffect(() => {
    const generatedStars: Star[] = []
    // Optimized star count for performance
    for (let i = 0; i < 200; i++) {
      generatedStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() > 0.75 ? 'large' : Math.random() > 0.5 ? 'medium' : Math.random() > 0.25 ? 'small' : 'tiny',
        delay: Math.random() * 8,
        bright: Math.random() > 0.85
      })
    }
    setStars(generatedStars)

    // More shooting stars with different trajectories
    const streaks: ShootingStar[] = []
    for (let i = 0; i < 10; i++) {
      streaks.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 80 - 20, // Начинаются выше экрана
        delay: Math.random() * 15
      })
    }
    setShootingStars(streaks)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 20%, rgba(117, 61, 255, 0.45), transparent 50%),
            radial-gradient(circle at 80% 30%, rgba(255, 58, 203, 0.3), transparent 55%),
            radial-gradient(circle at 50% 80%, rgba(75, 93, 255, 0.25), transparent 50%)
          `
        }}
      />

      {blobs.map((blob) => (
        <div
          key={blob.id}
          className={`neo-blob rounded-full ${blob.className}`}
          style={blob.style}
        />
      ))}

      <div className="absolute inset-0">
        {stars.map((star) => {
          const sizeClass =
            star.size === 'large' ? 'w-1 h-1' :
            star.size === 'medium' ? 'w-0.5 h-0.5' :
            star.size === 'small' ? 'w-[2px] h-[2px]' : 'w-px h-px'

          return (
            <div
              key={star.id}
              className={`absolute ${sizeClass} ${star.bright ? 'star-bright' : 'star-twinkle'}`}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                animationDelay: `${star.delay}s`
              }}
            />
          )
        })}
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {shootingStars.map((streak, index) => (
          <div
            key={streak.id}
            className="shooting-star"
            style={{
              left: `${streak.left}%`,
              top: `${streak.top}%`,
              animationDelay: `${streak.delay}s`,
              transformOrigin: 'top left'
            }}
          />
        ))}
      </div>

      <div className="neo-grain" />
    </div>
  )
}
