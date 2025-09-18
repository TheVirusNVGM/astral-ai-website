'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateSessionModal({ isOpen, onClose, onSuccess }: CreateSessionModalProps) {
  const [sessionName, setSessionName] = useState('')
  const [minecraftVersion, setMinecraftVersion] = useState('1.21.1')
  const [modLoader, setModLoader] = useState('fabric')
  const [maxPlayers, setMaxPlayers] = useState(10)
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const minecraftVersions = [
    '1.21.1', '1.21', '1.20.6', '1.20.4', '1.20.2', '1.20.1',
    '1.19.4', '1.19.2', '1.18.2', '1.17.1', '1.16.5'
  ]

  const modLoaders = [
    { value: 'fabric', label: 'Fabric' },
    { value: 'forge', label: 'Forge' },
    { value: 'vanilla', label: 'Vanilla' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sessionName.trim()) {
      setError('Session name is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No session found')
      }

      const response = await fetch('/api/p2p/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
          minecraftVersion,
          modLoader,
          maxPlayers,
          isPrivate,
          password: isPrivate && password.trim() ? password.trim() : null
        })
      })

      const data = await response.json()

      if (data.success) {
        // Reset form
        setSessionName('')
        setMinecraftVersion('1.21.1')
        setModLoader('fabric')
        setMaxPlayers(10)
        setIsPrivate(false)
        setPassword('')
        
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Failed to create session')
      }
    } catch (err) {
      setError('Failed to create session. Please try again.')
      console.error('Create session error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setError('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">🎮</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Create Game Session
            </h2>
            <p className="text-gray-300 text-sm">
              Set up a multiplayer session for you and your friends
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Name */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Session Name *
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="My Awesome Server"
                className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all bg-gray-800 text-white placeholder-gray-400"
                maxLength={50}
                disabled={isSubmitting}
              />
            </div>

            {/* Minecraft Version */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Minecraft Version
              </label>
              <select
                value={minecraftVersion}
                onChange={(e) => setMinecraftVersion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all bg-gray-800 text-white"
                disabled={isSubmitting}
              >
                {minecraftVersions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </div>

            {/* Mod Loader */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Mod Loader
              </label>
              <select
                value={modLoader}
                onChange={(e) => setModLoader(e.target.value)}
                className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all bg-gray-800 text-white"
                disabled={isSubmitting}
              >
                {modLoaders.map((loader) => (
                  <option key={loader.value} value={loader.value}>
                    {loader.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Players */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Max Players: {maxPlayers}
              </label>
              <input
                type="range"
                min="2"
                max="20"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                disabled={isSubmitting}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>2</span>
                <span>20</span>
              </div>
            </div>

            {/* Privacy Settings */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-3">
                Privacy Settings
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                    disabled={isSubmitting}
                  />
                  <span className="ml-2 text-sm text-gray-200">
                    Private session (requires password to join)
                  </span>
                </label>
                
                {isPrivate && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter session password"
                    className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all bg-gray-800 text-white placeholder-gray-400"
                    maxLength={50}
                    disabled={isSubmitting}
                  />
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !sessionName.trim()}
                className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
                  !isSubmitting && sessionName.trim()
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-lg'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}