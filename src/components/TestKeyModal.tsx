'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'

interface TestKeyModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TestKeyModal({ isOpen, onClose }: TestKeyModalProps) {
  const [key, setKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { user, updateUser } = useAuth()

  if (!isOpen) return null

  const handleActivate = async () => {
    if (!key.trim()) {
      setError('Please enter a test key')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/test-key/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ key: key.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to activate test key')
        setIsLoading(false)
        return
      }

      setSuccess(true)
      await updateUser() // Refresh user data to show new tier
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setKey('')
      }, 2000)

    } catch (err) {
      console.error('Error activating test key:', err)
      setError('Network error. Please try again.')
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setKey('')
      setError(null)
      setSuccess(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-cosmic/95 to-cosmic border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Activate Test Tier</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-white text-lg font-semibold mb-2">Test Tier Activated!</p>
            <p className="text-white/70 text-sm">Your subscription has been upgraded to test tier.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-white/70 text-sm mb-4">
                Enter your test key to activate test tier features. Test tier provides access to beta features in the launcher.
              </p>
              
              {user?.subscription_tier === 'test' && (
                <div className="bg-cosmic-purple-200/20 border border-cosmic-purple-200/50 rounded-lg p-3 mb-4">
                  <p className="text-cosmic-purple-100 text-sm">
                    ⚠️ You already have test tier active
                  </p>
                </div>
              )}

              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  Test Key
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value.toUpperCase())
                    setError(null)
                  }}
                  placeholder="TEST-XXXX-XXXX-XXXX"
                  disabled={isLoading || user?.subscription_tier === 'test'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-cosmic-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {error && (
                <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleActivate}
                disabled={isLoading || !key.trim() || user?.subscription_tier === 'test'}
                className="flex-1 px-4 py-3 bg-cosmic-purple-200 hover:bg-cosmic-purple-100 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Activating...' : 'Activate'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

