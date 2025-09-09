'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import OTPInput from './OTPInput'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

type AuthStep = 'email' | 'otp' | 'name'

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('email')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signInWithOTP, verifyOTP, signInWithProvider } = useAuth()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    
    setLoading(true)
    setError(null)

    try {
      const { error } = await signInWithOTP(email)
      if (error) {
        setError(error.message)
      } else {
        setStep('otp')
      }
    } catch {
      setError('Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await verifyOTP(email, otp)
      if (error) {
        setError(error.message)
      } else {
        if (mode === 'signup' && !name.trim()) {
          setStep('name')
        } else {
          onClose()
          resetForm()
        }
      }
    } catch {
      setError('Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    // Update user profile with name
    // This will be handled by the auth state change in AuthContext
    onClose()
    resetForm()
  }

  const handleProviderSignIn = async (provider: 'discord') => {
    setLoading(true)
    setError(null)

    const { error } = await signInWithProvider(provider)
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setStep('email')
    setEmail('')
    setOtp('')
    setName('')
    setError(null)
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md mx-4 bg-gradient-to-br from-cosmic/90 to-cosmic border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            {step === 'email' && (mode === 'signin' ? 'Welcome Back' : 'Join ASTRAL-AI')}
            {step === 'otp' && 'Check Your Email'}
            {step === 'name' && 'Complete Your Profile'}
          </h2>
          <p className="text-white/70">
            {step === 'email' && 'Enter your email to continue'}
            {step === 'otp' && `We sent a 6-digit code to ${email}`}
            {step === 'name' && 'Tell us your name to get started'}
          </p>
        </div>

        {/* Social Login - only on email step */}
        {step === 'email' && (
          <>
            <div className="mb-6">
              <button
                onClick={() => handleProviderSignIn('discord')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
                </svg>
                Continue with Discord
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 text-white/70 bg-cosmic">Or continue with email</span>
              </div>
            </div>
          </>
        )}

        {/* Email Step */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-cosmic-purple-200 focus:ring-1 focus:ring-cosmic-purple-200 transition-colors"
                placeholder="Enter your email"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 px-4 bg-cosmic-purple-200 hover:bg-cosmic-purple-100 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending Code...' : 'Continue'}
            </button>
          </form>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <form onSubmit={handleOTPSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-4 text-center">
                Enter the 6-digit code
              </label>
              <OTPInput
                value={otp}
                onChange={setOtp}
                loading={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setError(null)
                }}
                className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="flex-1 py-3 px-4 bg-cosmic-purple-200 hover:bg-cosmic-purple-100 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => handleEmailSubmit({ preventDefault: () => {} } as React.FormEvent)}
                disabled={loading}
                className="text-cosmic-purple-100 hover:text-cosmic-purple-50 text-sm transition-colors disabled:opacity-50"
              >
                Didn't receive code? Resend
              </button>
            </div>
          </form>
        )}

        {/* Name Step */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-cosmic-purple-200 focus:ring-1 focus:ring-cosmic-purple-200 transition-colors"
                placeholder="Enter your name"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 px-4 bg-cosmic-purple-200 hover:bg-cosmic-purple-100 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Completing...' : 'Complete'}
            </button>
          </form>
        )}

        {/* Info text */}
        {step === 'email' && (
          <div className="mt-6 text-center">
            <p className="text-white/70 text-sm">
              We'll send you a secure code to verify your email.
              <br />No passwords needed! 🎉
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
