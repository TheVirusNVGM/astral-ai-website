'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'

interface OAuthApp {
  client_id: string
  name: string
  redirect_uri: string
  scopes: string[]
}

// Registered OAuth applications
const OAUTH_APPS: Record<string, OAuthApp> = {
  'astral-launcher': {
    client_id: 'astral-launcher',
    name: 'ASTRAL-AI Launcher',
    redirect_uri: 'astral-ai://callback',
    scopes: ['profile', 'launcher']
  }
}

// Component that uses useSearchParams
function OAuthAuthorizeContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [app, setApp] = useState<OAuthApp | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAuthorizing, setIsAuthorizing] = useState(false)

  // Get OAuth parameters
  const client_id = searchParams.get('client_id')
  const redirect_uri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')
  const scope = searchParams.get('scope')

  useEffect(() => {
    if (!client_id) {
      setError('Missing client_id parameter')
      return
    }

    const oauthApp = OAUTH_APPS[client_id]
    if (!oauthApp) {
      setError('Unknown application')
      return
    }

    if (redirect_uri && redirect_uri !== oauthApp.redirect_uri) {
      setError('Invalid redirect_uri')
      return
    }

    setApp(oauthApp)
  }, [client_id, redirect_uri])

  const handleAuthorize = async () => {
    if (!user || !app) return

    setIsAuthorizing(true)
    setError(null)

    try {
      // Generate authorization code
      const code = generateAuthCode()
      
      console.log('🔐 Generated OAuth code:', code)
      console.log('💾 Saving to database:', {
        code,
        client_id: app.client_id,
        user_id: user.id,
        redirect_uri: app.redirect_uri,
        scope: scope || app.scopes.join(' '),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        state
      })
      
      // Save authorization code to database
      const { data: insertData, error: dbError } = await supabase
        .from('oauth_codes')
        .insert({
          code,
          client_id: app.client_id,
          user_id: user.id,
          redirect_uri: app.redirect_uri,
          scope: scope || app.scopes.join(' '),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
          state
        })
        .select()

      console.log('✅ Insert result:', { insertData, dbError })

      if (dbError) {
        console.error('❌ Database insert error:', dbError)
        throw dbError
      }

      // Redirect to launcher with code
      const callbackUrl = new URL(app.redirect_uri)
      callbackUrl.searchParams.set('code', code)
      if (state) callbackUrl.searchParams.set('state', state)

      console.log('🚀 Redirecting to launcher:', callbackUrl.toString())
      window.location.href = callbackUrl.toString()
      
      // Close the window after redirect (for OAuth flows opened in popup)
      // Small delay to ensure redirect happens first
      setTimeout(() => {
        if (window.opener) {
          // Window was opened via window.open(), safe to close
          window.close()
        } else {
          // Window was opened directly - try to close anyway
          // Browser may block this, but launcher should handle it
          try {
            window.close()
          } catch (e) {
            console.log('Could not close window (browser blocked)')
          }
        }
      }, 500)

    } catch (error) {
      console.error('❌ Authorization error:', error)
      setError('Failed to authorize application')
    } finally {
      setIsAuthorizing(false)
    }
  }

  const handleDeny = () => {
    if (!app) return

    // Redirect to launcher with error
    const callbackUrl = new URL(app.redirect_uri)
    callbackUrl.searchParams.set('error', 'access_denied')
    if (state) callbackUrl.searchParams.set('state', state)

    window.location.href = callbackUrl.toString()
    
    // Close window after redirect
    setTimeout(() => {
      try {
        window.close()
      } catch (e) {
        console.log('Could not close window')
      }
    }, 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-cosmic-purple-200 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) {
    // Redirect to login with return URL
    const returnUrl = `/oauth/authorize?${searchParams.toString()}`
    router.push(`/?login=true&return=${encodeURIComponent(returnUrl)}`)
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cosmic flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 max-w-md">
          <h1 className="text-white text-xl font-bold mb-2">Authorization Error</h1>
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-cosmic flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-cosmic-purple-200 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cosmic flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-cosmic/90 to-cosmic border border-white/10 rounded-2xl p-8 max-w-md w-full">
        {/* App Icon & Info */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cosmic-purple-200 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">Authorize Application</h1>
          <p className="text-white/70">
            <strong className="text-cosmic-purple-100">{app.name}</strong> wants to access your account
          </p>
        </div>

        {/* User Info */}
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <p className="text-white/70 text-sm mb-2">Signing in as:</p>
          <div className="flex items-center space-x-3">
            {user.avatar_url && (
              <img 
                src={user.avatar_url} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="text-white font-semibold">{user.name}</p>
              <p className="text-white/70 text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="mb-8">
          <p className="text-white font-semibold mb-3">This application will be able to:</p>
          <ul className="space-y-2">
            <li className="flex items-center space-x-2 text-white/80">
              <span className="text-green-400">✓</span>
              <span>Access your profile information</span>
            </li>
            <li className="flex items-center space-x-2 text-white/80">
              <span className="text-green-400">✓</span>
              <span>Launch and manage your game instances</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleDeny}
            disabled={isAuthorizing}
            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAuthorize}
            disabled={isAuthorizing}
            className="flex-1 px-4 py-3 bg-cosmic-purple-200 hover:bg-cosmic-purple-100 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {isAuthorizing ? 'Authorizing...' : 'Authorize'}
          </button>
        </div>

        {/* Security Notice */}
        <p className="text-white/50 text-xs text-center mt-6">
          Only authorize applications you trust. You can revoke access at any time in your account settings.
        </p>
      </div>
    </div>
  )
}

// Main component with Suspense boundary
export default function OAuthAuthorize() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cosmic flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-cosmic-purple-200 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <OAuthAuthorizeContent />
    </Suspense>
  )
}

function generateAuthCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
