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
      const response = await fetch('https://api.github.com/repos/TheVirusNVGM/astral-ai-launcher/releases/latest')
      const data = await response.json()
      setRelease(data)
    } catch (error) {
      console.error('Failed to fetch latest release:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWindowsDownload = () => {
    if (!release) return
    
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
            <div className="glass card p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Download ASTRAL-AI Launcher</h3>
                <button
                  onClick={onClose}
                  className="btn btn-ghost btn-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Version Info */}
              {release && (
                <div className="mb-6 p-3 bg-cosmic-purple-200/20 rounded-lg border border-cosmic-purple-200/30">
                  <p className="text-sm text-cosmic-purple-100 font-medium">
                    Latest Version: {release.tag_name}
                  </p>
                </div>
              )}

              {/* Platform Buttons */}
              <div className="space-y-3">
                {platforms.map((platform, index) => (
                  <motion.button
                    key={platform.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={platform.available ? platform.onClick : undefined}
                    disabled={!platform.available || loading}
                    className={`
                      w-full p-4 rounded-xl border transition-all duration-300 group
                      ${platform.available 
                        ? 'border-white/20 hover:border-white/40 hover:bg-white/5 cursor-pointer' 
                        : 'border-gray-600/30 cursor-not-allowed opacity-60'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Platform Icon */}
                      <div className={`
                        w-12 h-12 rounded-lg bg-gradient-to-br ${platform.gradient} 
                        flex items-center justify-center text-xl
                        ${platform.available ? 'group-hover:scale-110' : ''}
                        transition-transform duration-300
                      `}>
                        {platform.icon}
                      </div>

                      {/* Platform Info */}
                      <div className="flex-1 text-left">
                        <h4 className={`font-semibold ${platform.available ? 'text-white' : 'text-gray-400'}`}>
                          {platform.name}
                        </h4>
                        <p className={`text-sm ${platform.available ? 'text-white/70' : 'text-gray-500'}`}>
                          {platform.description}
                        </p>
                        <p className={`text-xs ${platform.available ? 'text-white/50' : 'text-gray-600'}`}>
                          {platform.filename}
                        </p>
                      </div>

                      {/* Download Icon or Status */}
                      <div className={`
                        text-2xl transition-colors duration-300
                        ${platform.available 
                          ? 'text-cosmic-purple-200 group-hover:text-cosmic-purple-100' 
                          : 'text-gray-500'
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
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center space-x-2 text-cosmic-purple-200">
                    <div className="w-4 h-4 border-2 border-cosmic-purple-200/30 border-t-cosmic-purple-200 rounded-full animate-spin"></div>
                    <span className="text-sm">Loading latest version...</span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-xs text-white/50 text-center">
                  System requirements: Windows 10/11 (64-bit), 4GB RAM
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
