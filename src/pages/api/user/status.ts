import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCorsHeaders } from '@/lib/cors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  const origin = req.headers.origin;
  const corsHeaders = getCorsHeaders(origin);
  
  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { status, current_game, is_playing } = req.body;

  if (!status || !['online', 'offline', 'away'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be online, offline, or away' });
  }

  try {
    // First, ensure user exists in users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { error: createError } = await supabase
        .from('users')
        .insert([{
          id: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url,
          created_at: new Date().toISOString()
        }]);

      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }
    }

    // Update or insert user status
    const statusData = {
      user_id: user.id,
      status,
      current_game: current_game || null,
      is_playing: is_playing || false,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Check if status record exists
    const { data: existingStatus } = await supabase
      .from('user_status')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (existingStatus) {
      // Update existing status
      const { error: updateError } = await supabase
        .from('user_status')
        .update(statusData)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating user status:', updateError);
        return res.status(500).json({ error: 'Failed to update status' });
      }
    } else {
      // Create new status record
      const { error: insertError } = await supabase
        .from('user_status')
        .insert([{
          ...statusData,
          created_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('Error creating user status:', insertError);
        return res.status(500).json({ error: 'Failed to create status' });
      }
    }

    // Also update the last_seen in users table
    await supabase
      .from('users')
      .update({ 
        updated_at: new Date().toISOString() 
      })
      .eq('id', user.id);

    res.status(200).json({
      success: true,
      status: {
        status,
        current_game,
        is_playing,
        last_seen: statusData.last_seen
      }
    });

  } catch (error) {
    console.error('Error in user/status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}