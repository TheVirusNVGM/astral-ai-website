import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCorsHeaders } from '@/lib/cors'
import { validateToken } from '@/lib/auth-utils'

export const runtime = 'edge'

// Pre-generated test keys (20 keys)
// Format: TEST-XXXX-XXXX-XXXX where X is alphanumeric
const TEST_KEYS = [
  'TEST-EMKG-SERZ-ZZGG',
  'TEST-BT6T-NPNH-PVTW',
  'TEST-7QDR-RXWP-DKDQ',
  'TEST-UKJO-8CPG-6WCR',
  'TEST-39ML-R57A-0V3E',
  'TEST-UW9J-26LH-21HZ',
  'TEST-DD86-4HZL-K8DO',
  'TEST-JJXS-QSRQ-0ZVF',
  'TEST-M2N7-VI8T-MU2B',
  'TEST-4FCP-2JHR-NX4C',
  'TEST-33S6-WUWY-T22R',
  'TEST-S75C-HEXF-YIEW',
  'TEST-A7Y4-RTCV-46GE',
  'TEST-NN3W-GH3W-GFOW',
  'TEST-RKDU-7RHU-8MT8',
  'TEST-EQXR-NJ2F-XGRX',
  'TEST-QLNN-V09V-A8GL',
  'TEST-JE91-PDD1-B7DL',
  'TEST-H8RI-4MDE-NYCF',
  'TEST-KPJL-4V78-Q8T9'
]

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401, headers: corsHeaders })
  }

  const userId = await validateToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
  }

  const { key } = await request.json()
  if (!key) {
    return NextResponse.json({ error: 'Test key is required' }, { status: 400, headers: corsHeaders })
  }

  // Validate and normalize key (case-insensitive, trim whitespace)
  const normalizedKey = key.trim().toUpperCase()
  
  if (!TEST_KEYS.includes(normalizedKey)) {
    return NextResponse.json({ error: 'Invalid test key' }, { status: 400, headers: corsHeaders })
  }

  try {
    // Check current subscription tier
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, subscription_tier')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders })
    }

    // Check if user already has test tier or higher
    if (currentUser.subscription_tier === 'test' || currentUser.subscription_tier === 'premium' || currentUser.subscription_tier === 'pro') {
      return NextResponse.json({ 
        error: 'User already has test tier or higher',
        current_tier: currentUser.subscription_tier
      }, { status: 400, headers: corsHeaders })
    }

    // Update subscription tier to 'test'
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        subscription_tier: 'test',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, subscription_tier, name, email')
      .single()

    if (updateError) {
      console.error('Error updating subscription tier:', updateError)
      return NextResponse.json({ error: 'Failed to activate test key' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({
      success: true,
      message: 'Test tier activated successfully',
      user: updatedUser
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Error activating test key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

