'use client'

import { useState } from 'react'
import DownloadDropdown from './DownloadDropdown'

export default function DownloadButton() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(true)}
        className="btn btn-primary btn-lg"
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
