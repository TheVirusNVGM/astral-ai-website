'use client'

// Force redeploy - updated ESLint fixes
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from './supabase'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  signInWithProvider: (provider: 'discord') => Promise<{ error: Error | null }>
  // OTP methods
  signInWithOTP: (email: string) => Promise<{ error: Error | null }>
  verifyOTP: (email: string, otp: string) => Promise<{ error: Error | null }>
  // Update user after username change
  updateUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  const fetchUserProfile = async (userId: string) => {
    console.log('🔄 fetchUserProfile started for userId:', userId)
    
    // Add timeout to prevent infinite loading
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('fetchUserProfile timeout')), 10000)
    )
    
    try {
      const fetchPromise = async () => {
        // Get user data from both users and profiles tables
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
          
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        console.log('🔍 fetchUserProfile result:', { userData, userError, profileData, profileError })
        
        if (userError && userError.code !== 'PGRST116') { // PGRST116 = not found, which is OK
          throw userError
        }

        if (userData) {
          // Merge user and profile data
          const combinedUser = {
            ...userData,
            // Use custom_username if available, otherwise use name
            name: profileData?.custom_username || userData.name,
            hasCustomUsername: profileData?.has_custom_username || false,
            customUsername: profileData?.custom_username || null,
            profileStatus: profileData?.status || 'offline'
          }
          
          setUser(combinedUser)
          console.log('👤 User profile loaded:', combinedUser)
          
          // Save session for launcher after user profile is loaded
          const { data: { session } } = await supabase.auth.getSession()
          console.log('🔑 Session for launcher:', session)
          if (session) {
            await saveLauncherSession(session, userId, data)
          }
        } else {
          console.log('⚠️ User profile not found, creating new one...')
          // User doesn't exist, create one
          const { data: { user: authUser } } = await supabase.auth.getUser()
          
          if (authUser) {
            const newUser = {
              id: authUser.id,
              name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'User',
              email: authUser.email || '',
              avatar_url: authUser.user_metadata?.avatar_url,
              created_at: new Date().toISOString()
            }
            
            const { data: createdUser } = await supabase
              .from('users')
              .insert([newUser])
              .select()
              .single()
              
            if (createdUser) {
              setUser(createdUser)
              console.log('✅ User profile created:', createdUser)
              
              // Save session for launcher after user profile is created
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                await saveLauncherSession(session, createdUser.id, createdUser)
              }
            }
          }
        }
      }
      
      // Race between fetch and timeout
      await Promise.race([fetchPromise(), timeout])
      
    } catch (fetchError) {
      console.error('❌ fetchUserProfile error:', fetchError)
      
      // Create fallback user from auth metadata if DB fails
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const fallbackUser = {
            id: authUser.id,
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            email: authUser.email || '',
            avatar_url: authUser.user_metadata?.avatar_url,
            subscription_tier: 'free' as const,
            created_at: new Date().toISOString()
          }
          setUser(fallbackUser)
          console.log('🔄 Using fallback user data:', fallbackUser)
          
          // Still try to save session for launcher
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            await saveLauncherSession(session, authUser.id, fallbackUser)
          }
        }
      } catch (fallbackError) {
        console.error('❌ Failed to create fallback user:', fallbackError)
      }
    }
  }

  const saveLauncherSession = async (session: { access_token?: string; refresh_token?: string; expires_in?: number; user?: { user_metadata?: { name?: string; avatar_url?: string }; email?: string } } | null, userId: string, userData?: User | null) => {
    // Check if launched from launcher
    const urlParams = new URLSearchParams(window.location.search)
    const isFromLauncher = urlParams.get('launcher') === 'true'
    
    console.log('🔍 saveLauncherSession called:', { 
      isFromLauncher, 
      hasSession: !!session, 
      hasUser: !!userData, 
      userId,
      url: window.location.href
    })
    
    // Save session if from launcher
    if (isFromLauncher && session) {
      if (userData) {
        console.log('✅ Creating launcher session with user data')
        
        const launcherSession = {
          access_token: session.access_token || '',
          refresh_token: session.refresh_token || '',
          expires_at: Date.now() + ((session.expires_in || 3600) * 1000),
          user: {
            id: userData.id,
            name: userData.name || session.user?.user_metadata?.name || 'ASTRAL User',
            email: userData.email || session.user?.email || '',
            avatar_url: userData.avatar_url || session.user?.user_metadata?.avatar_url,
            subscription_tier: 'free' as const, // Default tier
            created_at: userData.created_at || new Date().toISOString()
          }
        }
        
        try {
          // Save to launcher storage
          const saveResult = await saveLauncherSessionToFile(launcherSession)
          console.log('✅ Saved launcher session:', saveResult)
          
          // Try deep linking to return to launcher automatically
          setTimeout(() => {
            try {
              // Try custom URL scheme first
              const launcherUrl = 'astral-launcher://auth-success'
              window.location.href = launcherUrl
              
              console.log('🚀 Attempted to return to launcher via deep link')
              
              // If deep link fails, show success message after 2 seconds
              setTimeout(() => {
                alert('✅ Login successful! You can now return to the launcher.')
              }, 2000)
              
            } catch (deepLinkError) {
              console.warn('⚠️ Deep link failed:', deepLinkError)
              alert('✅ Login successful! You can now return to the launcher.')
            }
          }, 1000)
        } catch (error) {
          console.error('❌ Failed to save launcher session:', error)
          alert('❌ Failed to save session for launcher. Please try again.')
        }
      } else {
        console.log('⚠️ User data not ready yet, will retry when available')
        // For now, save a minimal session with session data only
        const minimalSession = {
          access_token: session.access_token || '',
          refresh_token: session.refresh_token || '',
          expires_at: Date.now() + ((session.expires_in || 3600) * 1000),
          user: {
            id: userId,
            name: session.user?.user_metadata?.name || session.user?.user_metadata?.full_name || 'ASTRAL User',
            email: session.user?.email || '',
            avatar_url: session.user?.user_metadata?.avatar_url,
            subscription_tier: 'free' as const,
            created_at: new Date().toISOString()
          }
        }
        
        try {
          const saveResult = await saveLauncherSessionToFile(minimalSession)
          console.log('✅ Saved minimal launcher session:', saveResult)
          
          // Try deep linking to return to launcher automatically
          setTimeout(() => {
            try {
              const launcherUrl = 'astral-launcher://auth-success'
              window.location.href = launcherUrl
              
              console.log('🚀 Attempted to return to launcher via deep link')
              
              setTimeout(() => {
                alert('✅ Login successful! You can now return to the launcher.')
              }, 2000)
              
            } catch (deepLinkError) {
              console.warn('⚠️ Deep link failed:', deepLinkError)
              alert('✅ Login successful! You can now return to the launcher.')
            }
          }, 1000)
        } catch (error) {
          console.error('❌ Failed to save minimal launcher session:', error)
          alert('❌ Failed to save session for launcher. Please try again.')
        }
      }
    }
  }

  const saveLauncherSessionToFile = async (sessionData: unknown) => {
    try {
      console.log('💾 Saving session for launcher via localStorage bridge')
      
      // Save to localStorage - this is the bridge between browser and launcher
      localStorage.setItem('astral-session', JSON.stringify(sessionData))
      console.log('✅ Session saved to localStorage bridge')
      
      // Note: Website only saves to localStorage - the launcher will read from there
      console.log('ℹ️ Website save complete - launcher will read from localStorage')
      
      return { success: true, method: 'localStorage-bridge' }
      
    } catch (error) {
      console.error('❌ Failed to save session:', error)
      throw error
    }
  }

  const clearLauncherSession = () => {
    localStorage.removeItem('astral-session')
    console.log('🗑️ Cleared launcher session from localStorage bridge')
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      console.log('🚀 getInitialSession started')
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('🔑 Initial session:', { session: !!session, error })
        
        if (session?.user) {
          console.log('👤 Setting supabase user:', session.user.id)
          setSupabaseUser(session.user)
          await fetchUserProfile(session.user.id)
        } else {
          console.log('ℹ️ No initial session found')
        }
      } catch (error) {
        console.error('❌ getInitialSession failed:', error)
      } finally {
        // Always set loading to false, regardless of success or failure
        console.log('✅ Setting loading to false and initialized to true')
        setLoading(false)
        setIsInitialized(true)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', { event, hasSession: !!session, isInitialized })
        
        // Skip if we're still in the initial loading phase to prevent race conditions
        if (!isInitialized && event !== 'SIGNED_OUT') {
          console.log('⏸️ Skipping auth state change - still initializing')
          return
        }
        
        try {
          if (session?.user) {
            console.log('👤 Auth change: setting user', session.user.id)
            setSupabaseUser(session.user)
            await fetchUserProfile(session.user.id)
          } else {
            console.log('🚃 Auth change: clearing user')
            setSupabaseUser(null)
            setUser(null)
            // Clear launcher session
            clearLauncherSession()
          }
        } catch (error) {
          console.error('❌ Auth state change error:', error)
        } finally {
          // Only set loading false if we're past initialization
          if (isInitialized) {
            console.log('✅ Auth change: setting loading to false')
            setLoading(false)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    })

    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const signInWithProvider = async (provider: 'discord') => {
    // Preserve launcher parameter through OAuth flow
    const urlParams = new URLSearchParams(window.location.search)
    const isFromLauncher = urlParams.get('launcher') === 'true'
    
    let redirectTo = `${window.location.origin}/auth/callback`
    if (isFromLauncher) {
      redirectTo += '?launcher=true'
    }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo
      }
    })

    return { error }
  }

  const signInWithOTP = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true
      }
    })

    return { error }
  }

  const verifyOTP = async (email: string, otp: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    })

    return { error }
  }
  
  const updateUser = async () => {
    if (supabaseUser) {
      await fetchUserProfile(supabaseUser.id)
    }
  }

  const value = {
    user,
    supabaseUser,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithProvider,
    signInWithOTP,
    verifyOTP,
    updateUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
