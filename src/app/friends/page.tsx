'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import CreateSessionModal from '@/components/CreateSessionModal'

interface Friend {
  id: string
  name: string
  custom_username?: string
  avatar_url?: string
  status: 'online' | 'offline' | 'away'
  last_seen?: string
  is_playing?: boolean
  current_game?: string
}

interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  sender?: {
    id: string
    name: string
    custom_username?: string
    avatar_url?: string
  }
}

interface GameSession {
  id: string
  name: string
  host_id: string
  host?: {
    name: string
    custom_username?: string
  }
  minecraft_version: string
  is_active: boolean
  player_count: number
  max_players: number
  created_at: string
}

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sessions'>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [gameSessions, setGameSessions] = useState<GameSession[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false)

  useEffect(() => {
    if (user && !authLoading) {
      loadData()
    }
  }, [user, authLoading])

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

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadFriends(),
        loadFriendRequests(),
        loadGameSessions()
      ])
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

  const loadGameSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/p2p/sessions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setGameSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Error loading game sessions:', error)
    }
  }

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

  const sendFriendRequest = async (userId: string) => {
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
          action: 'send',
          receiver_id: userId 
        })
      })

      if (response.ok) {
        alert('Friend request sent!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send friend request')
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('Failed to send friend request')
    }
  }

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'decline') => {
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
          action,
          request_id: requestId 
        })
      })

      if (response.ok) {
        await loadData() // Reload all data
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${action} friend request`)
      }
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error)
      alert(`Failed to ${action} friend request`)
    }
  }

  const removeFriend = async (friendId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ friend_id: friendId })
      })

      if (response.ok) {
        setFriends(friends.filter(f => f.id !== friendId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove friend')
      }
    } catch (error) {
      console.error('Error removing friend:', error)
      alert('Failed to remove friend')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Please Log In</h1>
          <p className="text-gray-300 mb-8">You need to be logged in to access the friends system.</p>
          <Link 
            href="/"
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">👥 Friends</h1>
            <p className="text-gray-300">Connect with friends and join game sessions</p>
          </div>
          <Link 
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for friends by username..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
              }}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-3 top-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">Search Results</h3>
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
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
                          onClick={() => sendFriendRequest(result.id)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            {[
              { id: 'friends', label: `Friends (${friends.length})`, icon: '👥' },
              { id: 'requests', label: `Requests (${friendRequests.length})`, icon: '📨' },
              { id: 'sessions', label: `Game Sessions (${gameSessions.length})`, icon: '🎮' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-16"
            >
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : (
            <>
              {activeTab === 'friends' && (
                <motion.div
                  key="friends"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {friends.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">👥</div>
                      <h3 className="text-2xl font-bold text-white mb-2">No friends yet</h3>
                      <p className="text-gray-400 mb-6">Search for users above to send friend requests!</p>
                    </div>
                  ) : (
                    friends.map((friend) => (
                      <div key={friend.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-lg">
                                  {friend.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-gray-800 rounded-full ${
                                friend.status === 'online' ? 'bg-green-500' : 
                                friend.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                              }`} />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold text-lg">
                                {friend.custom_username || friend.name}
                              </h3>
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm capitalize ${
                                  friend.status === 'online' ? 'text-green-400' : 
                                  friend.status === 'away' ? 'text-yellow-400' : 'text-gray-400'
                                }`}>
                                  {friend.status}
                                </span>
                                {friend.is_playing && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-blue-400 text-sm">
                                      Playing {friend.current_game || 'Minecraft'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button 
                              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                              🎮 Invite to Game
                            </button>
                            <button 
                              onClick={() => removeFriend(friend.id)}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'requests' && (
                <motion.div
                  key="requests"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {friendRequests.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">📨</div>
                      <h3 className="text-2xl font-bold text-white mb-2">No pending requests</h3>
                      <p className="text-gray-400">Friend requests will appear here</p>
                    </div>
                  ) : (
                    friendRequests.map((request) => (
                      <div key={request.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {request.sender?.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-white font-semibold text-lg">
                                {request.sender?.custom_username || request.sender?.name}
                              </h3>
                              <p className="text-gray-400 text-sm">
                                Sent {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => handleFriendRequest(request.id, 'accept')}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => handleFriendRequest(request.id, 'decline')}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'sessions' && (
                <motion.div
                  key="sessions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {gameSessions.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">🎮</div>
                      <h3 className="text-2xl font-bold text-white mb-2">No active game sessions</h3>
                      <p className="text-gray-400 mb-6">Create or join a game session to play with friends!</p>
                      <button 
                        onClick={() => setIsCreateSessionModalOpen(true)}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                      >
                        Create Game Session
                      </button>
                    </div>
                  ) : (
                    gameSessions.map((session) => (
                      <div key={session.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                              <span className="text-2xl">🎮</span>
                            </div>
                            <div>
                              <h3 className="text-white font-semibold text-lg">{session.name}</h3>
                              <div className="flex items-center space-x-2 text-sm">
                                <span className="text-gray-400">
                                  Host: {session.host?.custom_username || session.host?.name}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-400">
                                  Minecraft {session.minecraft_version}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-blue-400">
                                  {session.player_count}/{session.max_players} players
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              session.is_active 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {session.is_active ? 'Active' : 'Inactive'}
                            </div>
                            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors">
                              Join Session
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
      
      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={isCreateSessionModalOpen}
        onClose={() => setIsCreateSessionModalOpen(false)}
        onSuccess={() => {
          loadGameSessions() // Reload sessions after creating new one
          setActiveTab('sessions') // Switch to sessions tab
        }}
      />
    </div>
  )
}
