'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import AuthModal from './AuthModal'
import UsernameSetupModal from './UsernameSetupModal'
import FriendsDropdown from './FriendsDropdown'
import TestKeyModal from './TestKeyModal'

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false)
  const [isFriendsDropdownOpen, setIsFriendsDropdownOpen] = useState(false)
  const [isTestKeyModalOpen, setIsTestKeyModalOpen] = useState(false)
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
      <header className="relative z-50 border-b-4 border-neo-black/70 bg-[#080014]/85 backdrop-blur-xl text-[#f7ecff]">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.5em] font-semibold">
                  Astral launch lab
                </p>
                <p className="font-heavy text-3xl md:text-4xl tracking-tight leading-none">
                  ASTRAL.AI
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-5 uppercase text-xs tracking-[0.35em] font-semibold text-white/80">
              <a href="#hero" className="transition-colors hover:text-neo-accent">
                Overview
              </a>
              <a href="#toolkit" className="transition-colors hover:text-neo-accent">
                Toolkit
              </a>
              <a href="#pricing" className="transition-colors hover:text-neo-accent">
                Plans
              </a>
              <a href="#contact" className="transition-colors hover:text-neo-accent">
                Contact
              </a>
            </nav>

            <div className="flex items-center gap-3">
              {loading ? (
                <div className="w-9 h-9 border-4 border-neo-black border-t-transparent rounded-full animate-spin" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end text-right leading-tight">
                    <p className="font-semibold uppercase tracking-[0.2em] text-xs">
                      {user.name}
                    </p>
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-neo-black/70">
                      {user.subscription_tier}
                    </p>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setIsFriendsDropdownOpen(!isFriendsDropdownOpen)}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <span>👥</span>
                      Friends
                      {friendRequestCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-neo-orange text-neo-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
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
                    onClick={() => setIsTestKeyModalOpen(true)}
                    className="btn btn-test-key btn-sm"
                  >
                    Test Key
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="btn btn-outline btn-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleGetStarted}
                  className="btn btn-primary-nav btn-md"
                >
                  Get Access
                </button>
              )}
            </div>
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
      
      <TestKeyModal
        isOpen={isTestKeyModalOpen}
        onClose={() => setIsTestKeyModalOpen(false)}
      />
    </>
  )
}
