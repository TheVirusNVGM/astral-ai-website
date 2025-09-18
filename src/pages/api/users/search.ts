import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  if (query.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  try {
    // Search for users by custom_username or name
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('id, name, custom_username, avatar_url')
      .or(`custom_username.ilike.%${query}%,name.ilike.%${query}%`)
      .neq('id', user.id) // Exclude current user
      .limit(10);

    if (searchError) {
      console.error('Error searching users:', searchError);
      throw searchError;
    }

    // Check which users are already friends or have pending requests
    const userIds = users?.map(u => u.id) || [];
    
    if (userIds.length > 0) {
      // Get existing friendships
      const { data: friendships } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id)
        .in('friend_id', userIds);

      // Get pending friend requests (both sent and received)
      const { data: pendingRequests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'pending')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.in.(${userIds.join(',')})),` +
          `and(receiver_id.eq.${user.id},sender_id.in.(${userIds.join(',')}))`
        );

      const friendIds = new Set(friendships?.map(f => f.friend_id) || []);
      const pendingIds = new Set([
        ...(pendingRequests?.map(r => r.sender_id === user.id ? r.receiver_id : r.sender_id) || [])
      ]);

      // Add relationship status to each user
      const usersWithStatus = users?.map(searchUser => ({
        ...searchUser,
        relationship: friendIds.has(searchUser.id) ? 'friend' :
                    pendingIds.has(searchUser.id) ? 'pending' : 'none'
      }));

      res.status(200).json({
        success: true,
        users: usersWithStatus || []
      });
    } else {
      res.status(200).json({
        success: true,
        users: []
      });
    }

  } catch (error) {
    console.error('Error in users/search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}