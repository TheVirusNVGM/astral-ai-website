/**
 * CORS configuration for API endpoints
 * Restricts access to specific trusted domains
 */

const ALLOWED_ORIGINS = [
  'https://astral-ai.online',
  'https://www.astral-ai.online',
  // Add localhost for development
  'http://localhost:3000',
  'http://localhost:1420', // Tauri dev server
  'http://localhost:5174', // Vite dev server (launcher)
  'tauri://localhost', // Tauri app protocol
  'http://tauri.localhost', // Tauri app build protocol
]

/**
 * Get CORS headers with proper origin validation
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  // For development, allow localhost
  const isDev = process.env.NODE_ENV === 'development'
  const isAllowed = origin && (ALLOWED_ORIGINS.includes(origin) || (isDev && origin.includes('localhost')))
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://www.astral-ai.online',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin', // Important for proper caching with different origins
  }
}

/**
 * Validate if origin is allowed
 */
export function isOriginAllowed(origin?: string): boolean {
  if (!origin) return false
  
  const isDev = process.env.NODE_ENV === 'development'
  return ALLOWED_ORIGINS.includes(origin) || (isDev && origin.includes('localhost'))
}
