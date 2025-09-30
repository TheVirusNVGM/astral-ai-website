import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCorsHeaders } from '@/lib/cors';
import { validateToken } from '@/lib/auth-utils';

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
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const userId = await validateToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Get user data from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        custom_username,
        has_custom_username,
        avatar_url,
        subscription_tier,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw userError;
    }

    // Get friends count
    const { count: friendsCount } = await supabase
      .from('friends')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Build response
    const profileData = {
      user: {
        id: userData.id,
        name: userData.custom_username || userData.name, // Use custom_username if available
        email: userData.email,
        avatar_url: userData.avatar_url,
        subscription_tier: userData.subscription_tier || 'free',
        created_at: userData.created_at,
        custom_username: userData.custom_username,
        has_custom_username: userData.has_custom_username || false,
        friends_count: friendsCount || 0,
        last_seen: userData.updated_at || userData.created_at
      }
    };

    res.status(200).json(profileData);

  } catch (error) {
    console.error('Error in auth/profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}