'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

export default function Loader() {
  // Always start visible for now, user reported it "doesn't work" (likely due to localStorage check)
  const [isVisible, setIsVisible] = useState(true)
  const [shouldExit, setShouldExit] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Ensure we are on client
    if (typeof window === 'undefined') return

    // Set video playback rate to 2x
    const setPlaybackRate = () => {
      if (videoRef.current) {
        videoRef.current.playbackRate = 2.0
      }
    }
    
    // Try to set playback rate immediately and after video loads
    const video = videoRef.current
    if (video) {
      setPlaybackRate()
      video.addEventListener('loadedmetadata', setPlaybackRate)
    } else {
      // Wait for video ref to be available
      setTimeout(setPlaybackRate, 100)
    }
    
    // Show loader for 2 seconds, then trigger exit animation
    timerRef.current = setTimeout(() => {
      setShouldExit(true) // Start exit animation
      // Remove from DOM after animation completes
      setTimeout(() => {
        setIsVisible(false)
      }, 800) // Match exit animation duration
    }, 2000) // 2 seconds visible before exit animation starts

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (video) {
        video.removeEventListener('loadedmetadata', setPlaybackRate)
      }
    }
  }, [])

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={shouldExit ? { y: '-100%', opacity: 0 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
      className="fixed inset-0 bg-[#03010f] z-[10000] flex flex-col items-center justify-center"
    >
          {/* Видео с крутящимся кубом */}
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[400px] md:h-[400px]"
            style={{ mixBlendMode: 'screen' }}
          >
            <source src="/2.webm" type="video/webm" />
          </video>

          {/* Loading bars */}
          <div className="flex gap-2 h-32 items-end mb-8 relative z-10">
            {[0, 1, 2, 3, 4].map((index) => (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: '100%' }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.1,
                  ease: [0.43, 0.13, 0.23, 0.96]
                }}
                className="w-5 bg-neo-orange border-2 border-neo-black shadow-neo-sm"
              />
            ))}
          </div>

          {/* Loading text */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: shouldExit ? 0 : 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#f7ecff] font-heavy text-6xl md:text-8xl uppercase tracking-tighter relative z-10"
            style={{ mixBlendMode: 'exclusion' }}
          >
            LOADING
          </motion.h1>
    </motion.div>
  )
}

