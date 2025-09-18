import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // Получаем список друзей с их данными
    const { data: friends, error } = await supabase
      .from('friends')
      .select(`
        friend_id,
        created_at,
        users!friends_friend_id_fkey (
          id,
          name,
          custom_username,
          avatar_url,
          email
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }

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