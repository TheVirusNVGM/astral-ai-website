import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client for API operations that need to bypass RLS
// Fallback to anon key if service role key is not available
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey)

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
