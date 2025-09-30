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
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Try OAuth token first, then fallback to Supabase auth
  let user = null;
  let userId = null;
  
  // Try OAuth token validation
  userId = await validateToken(token);
  if (userId) {
    // Get user data for OAuth token
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (userData) {
      user = { id: userId, ...userData };
    }
  }
  
  // Fallback to Supabase auth if OAuth didn't work
  if (!user) {
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);
    if (supabaseUser && !authError) {
      user = supabaseUser;
      userId = user.id;
    }
  }
  
  if (!user || !userId) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'POST') {
    // Отправить заявку в друзья
    const { username, message = '' } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    try {
      // Найти пользователя по custom_username
      const { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('id, custom_username')
        .eq('custom_username', username)
        .single();

      if (userError || !targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (targetUser.id === userId) {
        return res.status(400).json({ error: 'Cannot add yourself as friend' });
      }

      // Проверить, не являются ли уже друзьями
      const { data: existingFriend } = await supabase
        .from('friends')
        .select('id')
        .eq('user_id', userId)
        .eq('friend_id', targetUser.id)
        .single();

      if (existingFriend) {
        return res.status(400).json({ error: 'Already friends' });
      }

      // Проверить, нет ли уже заявки
      const { data: existingRequest, error: existingRequestError } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${targetUser.id}),and(from_user_id.eq.${targetUser.id},to_user_id.eq.${user.id})`)
        .eq('status', 'pending')
        .maybeSingle();
      
      // Also check for any request regardless of status to avoid constraint violation
      if (!existingRequest && !existingRequestError) {
        const { data: anyRequest } = await supabase
          .from('friend_requests')
          .select('id, status')
          .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${targetUser.id}),and(from_user_id.eq.${targetUser.id},to_user_id.eq.${user.id})`)
          .maybeSingle();
          
        if (anyRequest) {
          if (anyRequest.status === 'declined') {
            return res.status(400).json({ error: 'Friend request was previously declined' });
          } else {
            return res.status(400).json({ error: `Friend request already exists with status: ${anyRequest.status}` });
          }
        }
      }

      if (existingRequest) {
        return res.status(400).json({ error: 'Friend request already exists' });
      }

      // Создать заявку
      const { data: newRequest, error } = await supabase
        .from('friend_requests')
        .insert([{
          from_user_id: user.id,
          to_user_id: targetUser.id,
          message: message
        }])
        .select(`
          id,
          message,
          created_at,
          users!friend_requests_to_user_id_fkey (
            custom_username,
            name
          )
        `)
        .single();

      if (error) {
        // Handle duplicate key constraint violation
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Friend request already exists' });
        }
        throw error;
      }

      res.status(200).json({ 
        success: true, 
        request: newRequest,
        message: `Friend request sent to ${targetUser.custom_username}`
      });

    } catch (error) {
      console.error('Error sending friend request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }

  } else if (req.method === 'PUT') {
    // Принять/отклонить заявку
    const { requestId, action } = req.body; // action: 'accept' | 'decline'

    if (!requestId || !action || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    try {
      // Получить заявку
      const { data: request, error: requestError } = await supabase
        .from('friend_requests')
        .select('id, from_user_id, to_user_id, status')
        .eq('id', requestId)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (requestError || !request) {
        return res.status(404).json({ error: 'Friend request not found' });
      }

      // Обновить статус заявки
      const newStatus = action === 'accept' ? 'accepted' : 'declined';
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Если принята - добавить в друзья
      if (action === 'accept') {
        const { error: friendsError } = await supabase
          .from('friends')
          .insert([
            { user_id: request.from_user_id, friend_id: request.to_user_id },
            { user_id: request.to_user_id, friend_id: request.from_user_id }
          ]);

        if (friendsError) {
          console.error('Error adding friends:', friendsError);
          throw friendsError;
        }
      }

      res.status(200).json({ 
        success: true, 
        message: `Friend request ${action}ed successfully`
      });

    } catch (error) {
      console.error('Error handling friend request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }

  } else if (req.method === 'GET') {
    // Получить список входящих заявок в друзья
    const { action } = req.query;
    
    if (action === 'list') {
      try {
        const { data: requests, error } = await supabase
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
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ 
          requests: requests || []
        });
      } catch (error) {
        console.error('Error fetching friend requests:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } else {
      res.status(400).json({ error: 'Invalid action parameter' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}