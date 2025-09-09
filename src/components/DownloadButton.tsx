'use client'

import { useState } from 'react'
import DownloadDropdown from './DownloadDropdown'

export default function DownloadButton() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(true)}
        className="px-8 py-4 bg-cosmic-purple-200 hover:bg-cosmic-purple-100 text-white text-lg font-semibold rounded-xl transition-all duration-300 hover:scale-105"
      >
        Download Free
      </button>
      
      <DownloadDropdown 
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
      />
    </div>
  )
}
