'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      
      // Check if this is from launcher
      const urlParams = new URLSearchParams(window.location.search)
      const isFromLauncher = urlParams.get('launcher') === 'true'
      
      console.log('🔄 Auth callback:', { isFromLauncher, hasSession: !!data.session, error })
      
      if (error) {
        console.error('Auth callback error:', error)
        const redirectUrl = isFromLauncher ? '/?error=auth_failed&launcher=true' : '/?error=auth_failed'
        router.push(redirectUrl)
      } else if (data.session) {
        const redirectUrl = isFromLauncher ? '/?launcher=true' : '/'
        console.log('✅ Redirecting to:', redirectUrl)
        router.push(redirectUrl)
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-cosmic flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cosmic-purple-200 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white">Completing authentication...</p>
      </div>
    </div>
  )
}
