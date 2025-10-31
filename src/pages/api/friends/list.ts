import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCorsHeaders } from '@/lib/cors';
import { validateToken } from '@/lib/auth-utils';

export const runtime = 'edge';

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

    // Получаем список друзей с их данными и статусом
    // Ищем в обе стороны, так как теперь храним только одну запись
    const { data: friendsData, error } = await supabase
      .from('friends')
      .select(`
        user_id,
        friend_id,
        created_at
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }

    // Получаем ID друзей (друг - это тот, кто НЕ является текущим юзером)
    const friendIds = friendsData?.map(f => 
      f.user_id === userId ? f.friend_id : f.user_id
    ) || [];
    
    // Получаем данные всех друзей
    let friendsUsers: any[] = [];
    let friendStatuses: any[] = [];
    
    if (friendIds.length > 0) {
      // Получаем данные юзеров
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, custom_username, avatar_url, email, updated_at')
        .in('id', friendIds);
      
      friendsUsers = usersData || [];
      
      // Получаем статусы
      const { data: statusData } = await supabase
        .from('user_status')
        .select('user_id, status, current_game, is_playing, last_seen')
        .in('user_id', friendIds);
      
      friendStatuses = statusData || [];
    }

    // Объединяем данные друзей со статусом
    const friends = friendsData?.map(friendRecord => {
      const friendId = friendRecord.user_id === userId ? friendRecord.friend_id : friendRecord.user_id;
      const friend = friendsUsers.find(u => u.id === friendId);
      
      if (!friend) return null;
      
      const status = friendStatuses.find(s => s.user_id === friend.id);
      
      // Определяем, онлайн ли юзер (активен за последние 5 минут)
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
    }).filter(Boolean) || [];

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
      .eq('to_user_id', userId)
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