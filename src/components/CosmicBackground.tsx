'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

interface Star {
  id: number
  x: number
  y: number
  size: 'tiny' | 'small' | 'medium' | 'large'
  delay: number
  duration: number
  bright?: boolean
}

interface ShootingStar {
  id: number
  left: number
  top: number
  delay: number
  duration: number
  angle: number
  length: number
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
    // Increased star count for a denser, deeper field
    for (let i = 0; i < 400; i++) {
      const rand = Math.random()
      let size: 'tiny' | 'small' | 'medium' | 'large' = 'tiny'
      
      if (rand > 0.97) size = 'large'
      else if (rand > 0.9) size = 'medium'
      else if (rand > 0.7) size = 'small'
      
      generatedStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4, // Varying duration for more natural feel
        bright: Math.random() > 0.9
      })
    }
    setStars(generatedStars)

    // Shooting stars with more variety
    const streaks: ShootingStar[] = []
    for (let i = 0; i < 8; i++) {
      streaks.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 60, // Mostly top half
        delay: Math.random() * 20, // Spread out start times
        duration: 2 + Math.random() * 3, // Random duration between 2-5s
        angle: 35 + Math.random() * 20, // Angle between 35 and 55 degrees
        length: 100 + Math.random() * 150 // Random length
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
            star.size === 'large' ? 'w-1.5 h-1.5' :
            star.size === 'medium' ? 'w-1 h-1' :
            star.size === 'small' ? 'w-[2px] h-[2px]' : 'w-[1px] h-[1px]'
            
          const opacityClass = 
            star.size === 'tiny' ? 'opacity-40' : 
            star.size === 'small' ? 'opacity-60' : 
            'opacity-90'

          return (
            <div
              key={star.id}
              className={`absolute rounded-full bg-white ${sizeClass} ${opacityClass} ${star.bright ? 'star-bright' : 'star-twinkle'}`}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`
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
              animationDuration: `${streak.duration}s`,
              '--star-angle': `${streak.angle}deg`,
              '--star-length': `${streak.length}px`,
              '--star-color': index % 3 === 0 ? '#ff3acb' : index % 2 === 0 ? '#4b5dff' : '#ffffff'
            } as React.CSSProperties}
          >
             {/* Glowing head */}
             <div className="absolute bottom-0 left-1/2 w-[4px] h-[4px] bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)] transform -translate-x-1/2 translate-y-1/2" />
          </div>
        ))}
      </div>

      <div className="neo-grain" />
    </div>
  )
}
