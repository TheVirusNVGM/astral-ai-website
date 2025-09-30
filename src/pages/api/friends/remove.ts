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
  
  if (req.method !== 'DELETE') {
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

  const { friendId } = req.body;

  if (!friendId) {
    return res.status(400).json({ error: 'Friend ID is required' });
  }

  try {
    // Проверить, что они действительно друзья
    const { data: friendship, error: friendshipError } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', friendId)
      .single();

    if (friendshipError || !friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    // Удалить дружбу в обе стороны
    const { error: deleteError } = await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

    if (deleteError) {
      console.error('Error removing friend:', deleteError);
      throw deleteError;
    }
    
    // Также удалить связанную заявку на дружбу (если есть)
    const { error: requestDeleteError } = await supabase
      .from('friend_requests')
      .delete()
      .or(`and(from_user_id.eq.${userId},to_user_id.eq.${friendId}),and(from_user_id.eq.${friendId},to_user_id.eq.${userId})`);
    
    if (requestDeleteError) {
      console.error('Error removing friend request:', requestDeleteError);
      // Не бросаем ошибку, так как это не критично
    }

    res.status(200).json({ 
      success: true, 
      message: 'Friend removed successfully' 
    });

  } catch (error) {
    console.error('Error in friends/remove:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}