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

  const { sessionId, friendId, invitationData = {} } = req.body;

  if (!sessionId || !friendId) {
    return res.status(400).json({ error: 'Session ID and friend ID are required' });
  }

  try {
    // Проверить, что сессия существует и пользователь является хостом
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, host_user_id, max_players, current_players, status')
      .eq('id', sessionId)
      .eq('host_user_id', user.id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Game session not found or you are not the host' });
    }

    if (session.status === 'closed') {
      return res.status(400).json({ error: 'Game session is closed' });
    }

    // Проверить, что пользователи друзья
    const { data: friendship, error: friendshipError } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .single();

    if (friendshipError || !friendship) {
      return res.status(400).json({ error: 'User is not your friend' });
    }

    // Проверить лимит игроков
    if (session.current_players >= session.max_players) {
      return res.status(400).json({ error: 'Game session is full' });
    }

    // Проверить, не приглашен ли уже
    const { data: existingInvitation } = await supabase
      .from('p2p_invitations')
      .select('id')
      .eq('session_id', sessionId)
      .eq('to_user_id', friendId)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return res.status(400).json({ error: 'Invitation already sent' });
    }

    // Проверить, не является ли уже участником
    const { data: existingParticipant } = await supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', friendId)
      .in('status', ['invited', 'joined'])
      .single();

    if (existingParticipant) {
      return res.status(400).json({ error: 'User is already invited or joined' });
    }

    // Создать приглашение
    const { data: invitation, error: invitationError } = await supabase
      .from('p2p_invitations')
      .insert([{
        session_id: sessionId,
        from_user_id: user.id,
        to_user_id: friendId,
        invitation_data: invitationData,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 минут
      }])
      .select(`
        id,
        invitation_data,
        expires_at,
        created_at,
        game_sessions!p2p_invitations_session_id_fkey (
          session_name,
          minecraft_version,
          mod_loader
        ),
        profiles!p2p_invitations_from_user_id_fkey (
          username,
          display_name
        )
      `)
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      throw invitationError;
    }

    // Добавить как участника со статусом invited
    const { error: participantError } = await supabase
      .from('session_participants')
      .insert([{
        session_id: sessionId,
        user_id: friendId,
        status: 'invited'
      }]);

    if (participantError) {
      console.error('Error adding participant:', participantError);
    }

    res.status(200).json({ 
      success: true,
      invitation: invitation,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Error in p2p/invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}