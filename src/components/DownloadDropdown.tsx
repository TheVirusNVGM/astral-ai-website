'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DownloadDropdownProps {
  isOpen: boolean
  onClose: () => void
}

interface GitHubAsset {
  name: string
  browser_download_url: string
}

interface GitHubRelease {
  tag_name: string
  assets: GitHubAsset[]
}

export default function DownloadDropdown({ isOpen, onClose }: DownloadDropdownProps) {
  const [release, setRelease] = useState<GitHubRelease | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && !release) {
      fetchLatestRelease()
    }
  }, [isOpen])

  const fetchLatestRelease = async () => {
    setLoading(true)
    try {
      const response = await fetch('https://api.github.com/repos/TheVirusNVGM/astral-ai-launcher-releases/releases/latest', {
        headers: {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        }
      })
      const data = await response.json()
      if (!response.ok || !Array.isArray((data as any)?.assets)) {
        throw new Error('Invalid GitHub releases response')
      }
      setRelease({ tag_name: (data as any).tag_name, assets: (data as any).assets })
    } catch (error) {
      console.error('Failed to fetch latest release:', error)
      setRelease(null)
    } finally {
      setLoading(false)
    }
  }

  const handleWindowsDownload = () => {
    if (!release || !Array.isArray(release.assets)) return
    
    const windowsAsset = release.assets.find(asset => 
      asset.name.toLowerCase().includes('.msi') || 
      asset.name.toLowerCase().includes('windows')
    )
    
    if (windowsAsset) {
      window.open(windowsAsset.browser_download_url, '_blank')
      onClose()
    }
  }

  const platforms = [
    {
      name: 'Windows',
      icon: '🪟',
      available: true,
      description: 'Download for Windows 10/11',
      filename: '.msi installer',
      onClick: handleWindowsDownload,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Linux',
      icon: '🐧', 
      available: false,
      description: 'Coming Soon',
      filename: '.deb package',
      onClick: () => {},
      gradient: 'from-gray-500 to-gray-600'
    },
    {
      name: 'macOS',
      icon: '🍎',
      available: false,
      description: 'Coming Soon', 
      filename: '.dmg installer',
      onClick: () => {},
      gradient: 'from-gray-500 to-gray-600'
    }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Download Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
          >
            <div className="border-4 border-neo-black bg-[#1a0034] shadow-neo-lg rounded-[24px] p-6 clip-corner relative overflow-hidden">
              {/* Background gradient */}
              <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(117, 61, 255, 0.3), transparent 70%)' }} />
              
              {/* Header */}
              <div className="relative flex items-center justify-between mb-6">
                <h3 className="text-xl font-heavy text-white uppercase tracking-tight">Download Launcher</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center border-2 border-neo-black bg-white/10 hover:bg-white/20 transition-all rounded-lg"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Version Info */}
              {release && (
                <div className="relative mb-6 p-3 bg-white/10 border-2 border-neo-black rounded-lg shadow-neo-sm">
                  <p className="text-sm text-white font-bold uppercase tracking-wider">
                    Latest: {release.tag_name}
                  </p>
                </div>
              )}

              {/* Platform Buttons */}
              <div className="relative space-y-3">
                {platforms.map((platform, index) => (
                  <motion.button
                    key={platform.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={platform.available ? platform.onClick : undefined}
                    disabled={!platform.available || loading}
                    className={`
                      w-full p-4 rounded-lg border-2 transition-all duration-200 group relative
                      ${platform.available 
                        ? 'border-neo-black bg-white/10 hover:bg-white/20 hover:shadow-neo cursor-pointer active:shadow-neo-sm' 
                        : 'border-neo-black/50 bg-white/5 cursor-not-allowed opacity-50'
                      }
                    `}
                    style={{
                      boxShadow: platform.available ? '4px 4px 0px 0px #0f0f0f' : '2px 2px 0px 0px #0f0f0f'
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Platform Icon */}
                      <div className={`
                        w-12 h-12 rounded-lg border-2 border-neo-black
                        flex items-center justify-center text-2xl
                        ${platform.available ? 'bg-white/20 group-hover:scale-110' : 'bg-white/5'}
                        transition-transform duration-200
                      `}>
                        {platform.icon}
                      </div>

                      {/* Platform Info */}
                      <div className="flex-1 text-left">
                        <h4 className={`font-heavy text-base uppercase tracking-tight ${platform.available ? 'text-white' : 'text-white/50'}`}>
                          {platform.name}
                        </h4>
                        <p className={`text-xs uppercase tracking-wider mt-1 ${platform.available ? 'text-white/70' : 'text-white/40'}`}>
                          {platform.description}
                        </p>
                        <p className={`text-[10px] uppercase tracking-widest mt-1 ${platform.available ? 'text-white/50' : 'text-white/30'}`}>
                          {platform.filename}
                        </p>
                      </div>

                      {/* Download Icon or Status */}
                      <div className={`
                        text-2xl transition-transform duration-200
                        ${platform.available 
                          ? 'group-hover:scale-125' 
                          : ''
                        }
                      `}>
                        {platform.available ? '⬇️' : '⏳'}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Loading State */}
              {loading && (
                <div className="relative mt-4 text-center">
                  <div className="inline-flex items-center gap-2 text-white">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-xs uppercase tracking-wider font-bold">Loading...</span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="relative mt-6 pt-4 border-t-2 border-neo-black">
                <p className="text-[10px] uppercase tracking-widest text-white/50 text-center">
                  Windows 10/11 (64-bit) • 4GB RAM
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
