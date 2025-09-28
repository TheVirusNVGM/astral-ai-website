'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import FindFriendsModal from './FindFriendsModal'

interface Friend {
  id: string
  name: string
  custom_username?: string
  avatar_url?: string
  status: 'online' | 'offline' | 'away'
  is_playing?: boolean
}

interface FriendRequest {
  id: string
  sender?: {
    id: string
    name: string
    custom_username?: string
  }
  created_at: string
}

interface FriendsDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export default function FriendsDropdown({ isOpen, onClose }: FriendsDropdownProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')
  const [isFindFriendsModalOpen, setIsFindFriendsModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadFriends(), loadFriendRequests()])
    } catch (error) {
      console.error('Error loading friends data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/friends/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFriends(data.friends || [])
      }
    } catch (error) {
      console.error('Error loading friends:', error)
    }
  }

  const loadFriendRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/friends/request?action=list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFriendRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Error loading friend requests:', error)
    }
  }

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/friends/request', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          action,
          requestId: requestId 
        })
      })

      if (response.ok) {
        await loadData() // Reload data
      }
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-sm z-50"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">👥 Friends</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'friends'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative ${
                activeTab === 'requests'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Requests ({friendRequests.length})
              {friendRequests.length > 0 && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'friends' && (
                <div className="p-2">
                  {friends.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-3xl mb-2">😔</div>
                      <p className="text-gray-400 text-sm">No friends yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {friends.map((friend) => (
                        <div key={friend.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                          <div className="relative">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {friend.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-gray-900 rounded-full ${
                              friend.status === 'online' ? 'bg-green-500' : 
                              friend.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">
                              {friend.custom_username || friend.name}
                            </p>
                            <div className="flex items-center space-x-1">
                              <span className={`text-xs capitalize ${
                                friend.status === 'online' ? 'text-green-400' : 
                                friend.status === 'away' ? 'text-yellow-400' : 'text-gray-400'
                              }`}>
                                {friend.status}
                              </span>
                              {friend.is_playing && (
                                <>
                                  <span className="text-gray-400 text-xs">•</span>
                                  <span className="text-blue-400 text-xs">Playing</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors">
                            Invite
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="p-2">
                  {friendRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-3xl mb-2">📭</div>
                      <p className="text-gray-400 text-sm">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {friendRequests.map((request) => (
                        <div key={request.id} className="p-3 rounded-lg bg-gray-800">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-xs">
                                  {request.sender?.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">
                                  {request.sender?.custom_username || request.sender?.name}
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {new Date(request.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleFriendRequest(request.id, 'accept')}
                              className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md font-medium transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleFriendRequest(request.id, 'decline')}
                              className="flex-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md font-medium transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700">
          <button 
            onClick={() => setIsFindFriendsModalOpen(true)}
            className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-medium transition-colors"
          >
            🔍 Find Friends
          </button>
        </div>
        
        <FindFriendsModal
          isOpen={isFindFriendsModalOpen}
          onClose={() => setIsFindFriendsModalOpen(false)}
        />
      </motion.div>
    </AnimatePresence>
  )
}