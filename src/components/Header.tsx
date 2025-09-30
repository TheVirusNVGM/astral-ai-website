'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import AuthModal from './AuthModal'
import UsernameSetupModal from './UsernameSetupModal'
import FriendsDropdown from './FriendsDropdown'

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false)
  const [isFriendsDropdownOpen, setIsFriendsDropdownOpen] = useState(false)
  const [friendRequestCount, setFriendRequestCount] = useState(0)
  const { user, loading, signOut, updateUser } = useAuth()

  // Load friend requests count
  const loadFriendRequestsCount = async () => {
    try {
      console.log('🔄 [Header] Loading friend requests count...')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('❌ [Header] No session for loading count')
        return
      }

      const response = await fetch('/api/friends/request?action=list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const count = data.requests?.length || 0
        console.log('✅ [Header] Friend requests count:', count)
        setFriendRequestCount(count)
      } else {
        console.error('❌ [Header] Failed to load friend requests:', response.status)
      }
    } catch (error) {
      console.error('❌ [Header] Error loading friend requests count:', error)
    }
  }

  // Real-time subscription for friend requests count
  useEffect(() => {
    if (!user?.id) return

    console.log('🔔 [Header] Setting up friend requests count subscription for user:', user.id)

    // Load initial count
    loadFriendRequestsCount()

    // Subscribe to changes
    const channel = supabase
      .channel('header_friend_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 [Header] Friend request change detected!', payload)
          loadFriendRequestsCount()
        }
      )
      .subscribe((status) => {
        console.log('📡 [Header] Subscription status:', status)
      })

    return () => {
      console.log('🔌 [Header] Unsubscribing from friend requests')
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Check if user needs to set username
  useEffect(() => {
    console.log('🔍 Header useEffect triggered:', { user, userId: user?.id, hasCustomUsername: user?.hasCustomUsername })
    
    if (user && user.id) {
      // Check if user has custom_username set
      const checkUsername = async () => {
        try {
          console.log('🔍 Username check:', {
            user,
            hasCustomUsername: user.hasCustomUsername,
            customUsername: user.customUsername,
            shouldShowModal: !user.hasCustomUsername
          })
          
          // Check if user has set a custom username
          if (!user.hasCustomUsername) {
            console.log('📝 Opening username setup modal')
            setIsUsernameModalOpen(true)
          } else {
            console.log('✅ User already has custom username:', user.customUsername)
          }
        } catch (err) {
          console.error('❌ Header error checking username:', err)
        }
      }
      
      console.log('🚀 About to call checkUsername()')
      checkUsername()
    } else {
      console.log('⚠️ Header: No user or user ID available')
    }
  }, [user])

  const handleGetStarted = () => {
    if (!user) {
      setIsAuthModalOpen(true)
    }
  }

  return (
    <>
      <header className="relative z-50 glass border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden animate-glow-pulse ring-1 ring-white/10">
                <Image
                  src="/logo.png"
                  alt="ASTRAL-AI Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ASTRAL-AI</h1>
                <p className="text-xs text-cosmic-purple-50/80">Minecraft Launcher</p>
              </div>
            </div>
            <nav className="flex items-center space-x-3">
              {loading ? (
                <div className="w-8 h-8 border-2 border-cosmic-purple-200 border-t-transparent rounded-full animate-spin" />
              ) : user ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-white font-semibold">{user.name}</p>
                    <p className="text-cosmic-purple-100 text-sm capitalize">{user.subscription_tier}</p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setIsFriendsDropdownOpen(!isFriendsDropdownOpen)}
                      className="btn btn-outline btn-sm flex items-center gap-2 relative"
                    >
                      <span>👥</span>
                      <span>Friends</span>
                      {friendRequestCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                          {friendRequestCount}
                        </span>
                      )}
                    </button>
                    <FriendsDropdown 
                      isOpen={isFriendsDropdownOpen}
                      onClose={() => setIsFriendsDropdownOpen(false)}
                    />
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="btn btn-ghost btn-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleGetStarted}
                  className="btn btn-primary btn-md"
                >
                  Get Started
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
      
      <UsernameSetupModal
        isOpen={isUsernameModalOpen}
        onClose={async (username) => {
          setIsUsernameModalOpen(false)
          if (username) {
            // Refresh user data to show new username
            await updateUser()
            console.log('Username set and user data refreshed:', username)
          }
        }}
      />
    </>
  )
}
