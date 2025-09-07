'use client'

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setSupabaseUser(session.user)
        await fetchUserProfile(session.user.id)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSupabaseUser(session.user)
          await fetchUserProfile(session.user.id)
          
          // Save session for launcher if launched from launcher
          await saveLauncherSession(session, session.user.id)
        } else {
          setSupabaseUser(null)
          setUser(null)
          // Clear launcher session
          clearLauncherSession()
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setUser(data)
    } else if (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const saveLauncherSession = async (session: any, userId: string) => {
    // Check if launched from launcher
    const urlParams = new URLSearchParams(window.location.search)
    const isFromLauncher = urlParams.get('launcher') === 'true'
    
    if (isFromLauncher && user) {
      const launcherSession = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: Date.now() + (session.expires_in * 1000),
        user: {
          id: user.id,
          name: user.name || 'ASTRAL User',
          email: user.email || '',
          avatar_url: user.avatar_url,
          subscription_tier: 'free', // Default tier
          created_at: user.created_at
        }
      }
      
      localStorage.setItem('astral-session', JSON.stringify(launcherSession))
      console.log('✅ Saved launcher session')
    }
  }

  const clearLauncherSession = () => {
    localStorage.removeItem('astral-session')
    console.log('🗑️ Cleared launcher session')
  }

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    return { error }
  }

  const value = {
    user,
    supabaseUser,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithProvider
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
