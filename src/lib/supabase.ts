import { createClient } from '@supabase/supabase-js'

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate required environment variables
if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing or invalid:', supabaseUrl)
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required')
}

if (!supabaseAnonKey || supabaseAnonKey.includes('placeholder')) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid')
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client for API operations that need to bypass RLS
// Use lazy initialization to avoid errors during build when key is not available
let _supabaseAdmin: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const adminKey = (supabaseServiceRoleKey && 
                      typeof supabaseServiceRoleKey === 'string' && 
                      supabaseServiceRoleKey.length > 0 &&
                      !supabaseServiceRoleKey.includes('placeholder') &&
                      supabaseServiceRoleKey !== 'undefined') 
      ? supabaseServiceRoleKey 
      : supabaseAnonKey
    
    _supabaseAdmin = createClient(supabaseUrl, adminKey)
  }
  return _supabaseAdmin
}

// Export as getter to delay initialization until runtime
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseAdmin()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

// Types for our database
export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  subscription_tier: 'free' | 'premium' | 'pro'
  created_at: string
  // Profile fields
  hasCustomUsername?: boolean
  customUsername?: string | null
  profileStatus?: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  minecraft_version: string
  loader: 'fabric' | 'forge' | 'quilt' | 'neoforge'
  created_at: string
  updated_at: string
}

export interface ProjectMod {
  id: string
  project_id: string
  mod_id: string
  mod_name: string
  version: string
  enabled: boolean
  position_x: number
  position_y: number
  category?: string
}

export interface DownloadStat {
  id: string
  user_id?: string
  launcher_version: string
  os: string
  created_at: string
}
