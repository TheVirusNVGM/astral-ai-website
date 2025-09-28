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
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Получаем список друзей с их данными и статусом
    const { data: friendsData, error } = await supabase
      .from('friends')
      .select(`
        friend_id,
        created_at,
        users!friends_friend_id_fkey (
          id,
          name,
          custom_username,
          avatar_url,
          email,
          updated_at
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }

    // Get status for all friends
    const friendIds = friendsData?.map(f => f.friend_id) || [];
    let friendStatuses: any[] = [];
    
    if (friendIds.length > 0) {
      const { data: statusData } = await supabase
        .from('user_status')
        .select('user_id, status, current_game, is_playing, last_seen')
        .in('user_id', friendIds);
      
      friendStatuses = statusData || [];
    }

    // Combine friends data with status
    const friends = friendsData?.map(friendRecord => {
      const friend = friendRecord.users;
      const status = friendStatuses.find(s => s.user_id === friend.id);
      
      // Determine if user is online (active within last 5 minutes)
      const lastSeen = status?.last_seen || friend.updated_at;
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const isRecentlyActive = lastSeen > fiveMinutesAgo;
      
      return {
        id: friend.id,
        name: friend.custom_username || friend.name,
        custom_username: friend.custom_username,
        avatar_url: friend.avatar_url,
        status: status?.status || (isRecentlyActive ? 'online' : 'offline'),
        is_playing: status?.is_playing || false,
        current_game: status?.current_game,
        last_seen: lastSeen,
        friendship_created: friendRecord.created_at
      };
    }) || [];

    // Получаем входящие заявки в друзья
    const { data: incomingRequests, error: requestsError } = await supabase
      .from('friend_requests')
      .select(`
        id,
        message,
        created_at,
        users!friend_requests_from_user_id_fkey (
          id,
          name,
          custom_username,
          avatar_url
        )
      `)
      .eq('to_user_id', user.id)
      .eq('status', 'pending');

    if (requestsError) {
      console.error('Error fetching friend requests:', requestsError);
    }

    res.status(200).json({ 
      friends: friends || [],
      incomingRequests: incomingRequests || []
    });

  } catch (error) {
    console.error('Error in friends/list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}