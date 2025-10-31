import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCorsHeaders } from '@/lib/cors'
import { validateToken } from '@/lib/auth-utils'

export const runtime = 'edge'

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

    // Check if key exists and is not used
    const { data: testKey, error: keyError } = await supabaseAdmin
      .from('test_keys')
      .select('id, key, user_id, used_at')
      .eq('key', normalizedKey)
      .single()

    if (keyError || !testKey) {
      return NextResponse.json({ error: 'Invalid test key' }, { status: 400, headers: corsHeaders })
    }

    // Check if key is already used
    if (testKey.user_id || testKey.used_at) {
      return NextResponse.json({ error: 'This test key has already been used' }, { status: 400, headers: corsHeaders })
    }

    // Update test key: mark as used and assign to user
    const { error: keyUpdateError } = await supabaseAdmin
      .from('test_keys')
      .update({
        user_id: userId,
        used_at: new Date().toISOString()
      })
      .eq('id', testKey.id)

    if (keyUpdateError) {
      console.error('Error updating test key:', keyUpdateError)
      return NextResponse.json({ error: 'Failed to activate test key' }, { status: 500, headers: corsHeaders })
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
      // Rollback test key update
      await supabaseAdmin
        .from('test_keys')
        .update({
          user_id: null,
          used_at: null
        })
        .eq('id', testKey.id)
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

