'use client'

import { useState, useRef, useEffect } from 'react'

interface OTPInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  loading?: boolean
}

export default function OTPInput({ value, onChange, length = 6, loading = false }: OTPInputProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const digits = value.split('').slice(0, length)
  while (digits.length < length) {
    digits.push('')
  }

  const handleChange = (index: number, newValue: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(newValue)) return
    
    const newDigits = [...digits]
    newDigits[index] = newValue
    
    const newOtp = newDigits.join('')
    onChange(newOtp)

    // Auto focus next input
    if (newValue && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
      setFocusedIndex(index + 1)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous input on backspace
      inputsRef.current[index - 1]?.focus()
      setFocusedIndex(index - 1)
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
      setFocusedIndex(index - 1)
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
      setFocusedIndex(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasteData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length)
    onChange(pasteData)
    
    // Focus the last filled input or next empty one
    const focusIndex = Math.min(pasteData.length, length - 1)
    inputsRef.current[focusIndex]?.focus()
    setFocusedIndex(focusIndex)
  }

  useEffect(() => {
    // Auto focus first input when component mounts
    inputsRef.current[0]?.focus()
  }, [])

  return (
    <div className="flex justify-center gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => setFocusedIndex(index)}
          disabled={loading}
          className={`w-12 h-12 text-center text-xl font-bold bg-white/10 border rounded-lg text-white placeholder-white/50 transition-all duration-200 focus:outline-none disabled:opacity-50
            ${focusedIndex === index || digit
              ? 'border-cosmic-purple-200 ring-1 ring-cosmic-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
              : 'border-white/20 hover:border-white/40'
            }
          `}
          placeholder="•"
        />
      ))}
    </div>
  )
}
