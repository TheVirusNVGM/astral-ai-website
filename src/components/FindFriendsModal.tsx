'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface FindFriendsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  id: string
  name: string
  custom_username?: string
  avatar_url?: string
  relationship: 'friend' | 'pending' | 'none'
}

export default function FindFriendsModal({ isOpen, onClose }: FindFriendsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/users/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ query })
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
      } else {
        console.error('Search failed:', await response.text())
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const sendFriendRequest = async (username: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          username: username 
        })
      })

      if (response.ok) {
        // Refresh search to update relationship status
        if (searchQuery.trim()) {
          searchUsers(searchQuery)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send friend request')
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('Failed to send friend request')
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setSearchResults([])
    onClose()
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
          className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🔍</span>
              </div>
              <h2 className="text-xl font-bold text-white">Find Friends</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by username or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Type at least 2 characters to search
            </p>
          </div>

          {/* Search Results */}
          <div className="max-h-80 overflow-y-auto">
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-white font-semibold text-sm">Search Results</h3>
                {searchResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {result.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">{result.custom_username || result.name}</p>
                        {result.custom_username && (
                          <p className="text-gray-400 text-sm">@{result.custom_username}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {result.relationship === 'friend' ? (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-semibold">
                          ✓ Friends
                        </span>
                      ) : result.relationship === 'pending' ? (
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-semibold">
                          ⏳ Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => sendFriendRequest(result.custom_username || result.name)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.trim() && !isSearching ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🕵️</div>
                <p className="text-gray-400">No users found</p>
                <p className="text-gray-500 text-sm">Try a different search term</p>
              </div>
            ) : !searchQuery.trim() ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👋</div>
                <p className="text-gray-400">Start typing to find friends</p>
                <p className="text-gray-500 text-sm">Search by username or name</p>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}