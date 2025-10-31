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

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Получить активные сессии пользователя (где он хост)
    const { data: hostSessions, error: hostError } = await supabase
      .from('game_sessions')
      .select(`
        id,
        session_name,
        minecraft_version,
        mod_loader,
        max_players,
        current_players,
        is_private,
        status,
        created_at,
        updated_at,
        session_participants!session_participants_session_id_fkey (
          user_id,
          status,
          joined_at,
          profiles!session_participants_user_id_fkey (
            username,
            display_name,
            avatar_url,
            status
          )
        )
      `)
      .eq('host_user_id', user.id)
      .in('status', ['waiting', 'active']);

    if (hostError) {
      console.error('Error fetching host sessions:', hostError);
      throw hostError;
    }

    // Получить сессии, в которых пользователь является участником
    const { data: participantSessions, error: participantError } = await supabase
      .from('session_participants')
      .select(`
        status,
        joined_at,
        p2p_connection_data,
        game_sessions!session_participants_session_id_fkey (
          id,
          session_name,
          minecraft_version,
          mod_loader,
          max_players,
          current_players,
          is_private,
          status,
          created_at,
          updated_at,
          profiles!game_sessions_host_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['invited', 'joined']);

    if (participantError) {
      console.error('Error fetching participant sessions:', participantError);
      throw participantError;
    }

    // Получить входящие P2P приглашения
    const { data: invitations, error: invitationsError } = await supabase
      .from('p2p_invitations')
      .select(`
        id,
        invitation_data,
        expires_at,
        created_at,
        game_sessions!p2p_invitations_session_id_fkey (
          id,
          session_name,
          minecraft_version,
          mod_loader,
          max_players,
          current_players
        ),
        profiles!p2p_invitations_from_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
    }

    // Получить публичные сессии друзей
    const { data: friendsSessions, error: friendsError } = await supabase
      .rpc('get_friends_public_sessions', { user_id: user.id });

    if (friendsError) {
      console.error('Error fetching friends sessions:', friendsError);
    }

    res.status(200).json({
      hostSessions: hostSessions || [],
      participantSessions: participantSessions || [],
      invitations: invitations || [],
      friendsSessions: friendsSessions || []
    });

  } catch (error) {
    console.error('Error in p2p/sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}