import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
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

  const { friendId } = req.body;

  if (!friendId) {
    return res.status(400).json({ error: 'Friend ID is required' });
  }

  try {
    // Проверить, что они действительно друзья
    const { data: friendship, error: friendshipError } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .single();

    if (friendshipError || !friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    // Удалить дружбу в обе стороны
    const { error: deleteError } = await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

    if (deleteError) {
      console.error('Error removing friend:', deleteError);
      throw deleteError;
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