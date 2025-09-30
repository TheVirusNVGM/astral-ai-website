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
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'PUT') {
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

  const { sessionId, invitationId, connectionData = {}, password = null } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // Получить информацию о сессии
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, host_user_id, max_players, current_players, is_private, password, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    if (session.status !== 'waiting' && session.status !== 'active') {
      return res.status(400).json({ error: 'Game session is not available' });
    }

    if (session.current_players >= session.max_players) {
      return res.status(400).json({ error: 'Game session is full' });
    }

    // Проверить пароль для приватных сессий
    if (session.is_private && session.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Если есть invitation ID, проверить и принять приглашение
    if (invitationId) {
      const { data: invitation, error: invitationError } = await supabase
        .from('p2p_invitations')
        .select('id, to_user_id, expires_at')
        .eq('id', invitationId)
        .eq('session_id', sessionId)
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitation) {
        return res.status(404).json({ error: 'Invitation not found or expired' });
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Invitation has expired' });
      }

      // Принять приглашение
      const { error: acceptError } = await supabase
        .from('p2p_invitations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', invitationId);

      if (acceptError) {
        console.error('Error accepting invitation:', acceptError);
      }
    } else {
      // Для публичных сессий проверить, что хост - друг пользователя
      if (!session.is_private) {
        const { data: friendship } = await supabase
          .from('friends')
          .select('id')
          .eq('user_id', userId)
          .eq('friend_id', session.host_user_id)
          .single();

        if (!friendship) {
          return res.status(403).json({ error: 'You can only join sessions of your friends' });
        }
      }
    }

    // Проверить, не является ли уже участником
    const { data: existingParticipant, error: participantCheckError } = await supabase
      .from('session_participants')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (participantCheckError && participantCheckError.code !== 'PGRST116') {
      throw participantCheckError;
    }

    if (existingParticipant) {
      if (existingParticipant.status === 'joined') {
        return res.status(400).json({ error: 'Already joined this session' });
      }
      
      // Обновить статус участника
      const { error: updateError } = await supabase
        .from('session_participants')
        .update({ 
          status: 'joined',
          p2p_connection_data: connectionData,
          joined_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating participant status:', updateError);
        throw updateError;
      }
    } else {
      // Добавить как нового участника
      const { error: participantError } = await supabase
        .from('session_participants')
        .insert([{
          session_id: sessionId,
          user_id: userId,
          status: 'joined',
          p2p_connection_data: connectionData
        }]);

      if (participantError) {
        console.error('Error adding participant:', participantError);
        throw participantError;
      }
    }

    // Обновить количество игроков в сессии
    const { error: updateSessionError } = await supabase
      .from('game_sessions')
      .update({ 
        current_players: session.current_players + 1,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateSessionError) {
      console.error('Error updating session:', updateSessionError);
    }

    // Получить обновленную информацию о сессии
    const { data: updatedSession, error: fetchError } = await supabase
      .from('game_sessions')
      .select(`
        id,
        session_name,
        minecraft_version,
        mod_loader,
        current_players,
        max_players,
        p2p_data,
        profiles!game_sessions_host_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated session:', fetchError);
    }

    res.status(200).json({ 
      success: true,
      message: 'Successfully joined the session',
      session: updatedSession
    });

  } catch (error) {
    console.error('Error in p2p/join:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}