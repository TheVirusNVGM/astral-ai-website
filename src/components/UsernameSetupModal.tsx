'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UsernameSetupModalProps {
  isOpen: boolean;
  onClose: (username?: string) => void;
}

export default function UsernameSetupModal({ isOpen, onClose }: UsernameSetupModalProps) {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced username check
  useEffect(() => {
    if (!username || username.length < 3) {
      setIsAvailable(null);
      setError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsChecking(true);
      setError('');

      try {
        const response = await fetch('/api/username/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });

        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          setIsAvailable(false);
        } else {
          setIsAvailable(data.available);
          if (!data.available) {
            setError(data.message);
          }
        }
      } catch (err) {
        setError('Failed to check username');
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAvailable || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Get current session token
      const session = localStorage.getItem('astral-session');
      if (!session) {
        throw new Error('No session found');
      }

      const sessionData = JSON.parse(session);
      const token = sessionData.access_token;

      const response = await fetch('/api/username/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (data.success) {
        onClose(username);
      } else {
        setError(data.error || 'Failed to set username');
      }
    } catch (err) {
      setError('Failed to set username. Please try again.');
      console.error('Username set error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Choose Your Username
            </h2>
            <p className="text-gray-300 text-sm">
              💡 We recommend using the same username as your Minecraft account for easier gameplay with friends
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username..."
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:outline-none transition-all bg-gray-800 text-white placeholder-gray-400 ${
                    error
                      ? 'border-red-500 focus:ring-red-500'
                      : isAvailable === true
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-600 focus:ring-blue-500'
                  }`}
                  maxLength={20}
                  disabled={isSubmitting}
                />
                
                {/* Status indicator */}
                <div className="absolute right-3 top-3 flex items-center">
                  {isChecking && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {!isChecking && isAvailable === true && (
                    <span className="text-green-500 text-xl">✓</span>
                  )}
                  {!isChecking && isAvailable === false && (
                    <span className="text-red-500 text-xl">✕</span>
                  )}
                </div>
              </div>

              {/* Error/Success message */}
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
              {isAvailable === true && !error && (
                <p className="text-green-600 text-sm mt-2">✓ Username is available!</p>
              )}

              {/* Format hint */}
              <p className="text-gray-400 text-xs mt-1">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onClose()}
                className="flex-1 px-6 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800 transition-colors"
                disabled={isSubmitting}
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={!isAvailable || isSubmitting}
                className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
                  isAvailable && !isSubmitting
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Setting...' : 'Set Username'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}