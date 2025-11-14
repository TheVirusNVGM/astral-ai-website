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
  const [friendActionsVisible, setFriendActionsVisible] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  // Real-time subscription for friend requests
  useEffect(() => {
    if (!isOpen) return

    const setupRealtimeSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        console.log('❌ No session for realtime subscription')
        return
      }

      console.log('🔔 Setting up realtime subscription for user:', session.user.id)

      // Subscribe to friend_requests changes (incoming and outgoing)
      const channel = supabase
        .channel('friend_requests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friend_requests',
            filter: `to_user_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('🔔 Incoming friend request change:', payload)
            loadFriendRequests()
            // Also reload friends if request was accepted
            if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              loadFriends()
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friend_requests',
            filter: `from_user_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('🔔 Outgoing friend request change:', payload)
            // Reload friends if request was accepted
            if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              loadFriends()
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Friend requests subscription status:', status)
        })

      return () => {
        console.log('🔌 Unsubscribing from friend requests')
        supabase.removeChannel(channel)
      }
    }

    setupRealtimeSubscription()
  }, [isOpen])

  // Real-time subscription for friends list
  useEffect(() => {
    if (!isOpen) return

    const setupFriendsSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        console.log('❌ No session for friends subscription')
        return
      }

      console.log('👥 Setting up friends realtime subscription for user:', session.user.id)

      // Subscribe to friends table changes (both directions)
      const channel = supabase
        .channel('friends_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friends',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('👥 Friends list change detected (user_id):', payload)
            loadFriends()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friends',
            filter: `friend_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('👥 Friends list change detected (friend_id):', payload)
            loadFriends()
          }
        )
        .subscribe((status) => {
          console.log('📡 Friends subscription status:', status)
        })

      return () => {
        console.log('🔌 Unsubscribing from friends')
        supabase.removeChannel(channel)
      }
    }

    setupFriendsSubscription()
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
        setFriendActionsVisible(null)
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

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (!confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/friends/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          friendId: friendId 
        })
      })

      if (response.ok) {
        await loadData() // Reload data
      } else {
        const error = await response.json()
        alert(`Failed to remove friend: ${error.error}`)
      }
    } catch (error) {
      console.error('Error removing friend:', error)
      alert('Failed to remove friend. Please try again.')
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
        className="absolute top-full right-0 mt-2 w-80 border-4 border-neo-black bg-[#1a0034] shadow-neo-lg rounded-[24px] clip-corner relative overflow-hidden z-50"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(117, 61, 255, 0.3), transparent 70%)' }} />
        
        {/* Header */}
        <div className="relative p-4 border-b-4 border-neo-black/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-heavy uppercase tracking-tight text-sm">👥 Friends</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center border-2 border-neo-black bg-white/10 hover:bg-white/20 transition-all rounded-lg text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-2 bg-white/5 border-2 border-neo-black rounded-lg p-1">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-heavy uppercase tracking-wider transition-all ${
                activeTab === 'friends'
                  ? 'bg-neo-orange text-white shadow-neo-sm'
                  : 'text-white/60 hover:text-white bg-transparent'
              }`}
            >
              Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-heavy uppercase tracking-wider transition-all relative ${
                activeTab === 'requests'
                  ? 'bg-neo-orange text-white shadow-neo-sm'
                  : 'text-white/60 hover:text-white bg-transparent'
              }`}
            >
              Requests ({friendRequests.length})
              {friendRequests.length > 0 && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-neo-orange border-2 border-neo-black rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-neo-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'friends' && (
                <div className="p-2">
                  {friends.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-3xl mb-2">😔</div>
                      <p className="text-white/60 text-xs uppercase tracking-wider font-semibold">No friends yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {friends.map((friend) => (
                        <div 
                          key={friend.id} 
                          className="flex items-center space-x-3 p-3 rounded-lg border-2 border-transparent hover:border-neo-black/30 hover:bg-white/5 transition-all relative"
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setFriendActionsVisible(friendActionsVisible === friend.id ? null : friend.id)
                          }}
                        >
                          <div className="relative">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-neo-black shadow-neo-sm">
                              <span className="text-white font-heavy text-xs">
                                {(friend.custom_username || friend.name).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-neo-black rounded-full ${
                              friend.status === 'online' ? 'bg-green-400' : 
                              friend.status === 'away' ? 'bg-yellow-400' : 'bg-white/40'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-xs truncate uppercase tracking-tight">
                              {friend.custom_username || friend.name}
                            </p>
                            <div className="flex items-center space-x-1">
                              <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                                friend.status === 'online' ? 'text-green-400' : 
                                friend.status === 'away' ? 'text-yellow-400' : 'text-white/50'
                              }`}>
                                {friend.status}
                              </span>
                              {friend.is_playing && (
                                <>
                                  <span className="text-white/30 text-[10px]">•</span>
                                  <span className="text-purple-400 text-[10px] uppercase tracking-wider font-semibold">Playing</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions - Three dots or Remove button */}
                          {friendActionsVisible === friend.id ? (
                            <button
                              onClick={() => {
                                setFriendActionsVisible(null)
                                handleRemoveFriend(friend.id, friend.custom_username || friend.name)
                              }}
                              className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] uppercase tracking-wider rounded border-2 border-neo-black shadow-neo-sm transition-all font-heavy"
                            >
                              ✕ Remove
                            </button>
                          ) : (
                            <button 
                              onClick={() => setFriendActionsVisible(friend.id)}
                              className="text-white/40 hover:text-white text-lg p-1 rounded transition-colors"
                            >
                              ⋮
                            </button>
                          )}
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
                      <p className="text-white/60 text-xs uppercase tracking-wider font-semibold">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {friendRequests.map((request) => (
                        <div key={request.id} className="p-3 rounded-lg border-2 border-neo-black/30 bg-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-neo-black shadow-neo-sm">
                                <span className="text-white font-heavy text-xs">
                                  {(request.sender?.custom_username || request.sender?.name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-semibold text-xs uppercase tracking-tight">
                                  {request.sender?.custom_username || request.sender?.name || 'Unknown User'}
                                </p>
                                <p className="text-white/50 text-[10px] uppercase tracking-wider">
                                  {new Date(request.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleFriendRequest(request.id, 'accept')}
                              className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-[10px] uppercase tracking-wider rounded-md border-2 border-neo-black shadow-neo-sm transition-all font-heavy"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleFriendRequest(request.id, 'decline')}
                              className="flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] uppercase tracking-wider rounded-md border-2 border-neo-black shadow-neo-sm transition-all font-heavy"
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
        <div className="relative p-3 border-t-4 border-neo-black/50">
          <button 
            onClick={() => setIsFindFriendsModalOpen(true)}
            className="w-full px-3 py-2 bg-neo-orange hover:bg-neo-orange/90 text-white text-xs uppercase tracking-wider rounded-lg border-2 border-neo-black shadow-neo-sm transition-all font-heavy"
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