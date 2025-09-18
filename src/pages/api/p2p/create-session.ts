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

  const { 
    sessionName, 
    minecraftVersion, 
    modLoader, 
    maxPlayers = 10,
    isPrivate = false,
    password = null,
    hostPort = null,
    p2pData = {} 
  } = req.body;

  if (!sessionName || !minecraftVersion || !modLoader) {
    return res.status(400).json({ 
      error: 'Session name, Minecraft version, and mod loader are required' 
    });
  }

  try {
    // Проверить, нет ли активной сессии у пользователя
    const { data: existingSession } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('host_user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingSession) {
      return res.status(400).json({ 
        error: 'You already have an active game session' 
      });
    }

    // Создать игровую сессию
    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert([{
        host_user_id: user.id,
        session_name: sessionName,
        minecraft_version: minecraftVersion,
        mod_loader: modLoader,
        max_players: maxPlayers,
        is_private: isPrivate,
        password: password,
        host_port: hostPort,
        p2p_data: p2pData,
        status: 'waiting'
      }])
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
        profiles!game_sessions_host_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating game session:', error);
      throw error;
    }

    // Добавить хоста как участника
    const { error: participantError } = await supabase
      .from('session_participants')
      .insert([{
        session_id: session.id,
        user_id: user.id,
        status: 'joined'
      }]);

    if (participantError) {
      console.error('Error adding host as participant:', participantError);
    }

    res.status(200).json({ 
      success: true,
      session: session
    });

  } catch (error) {
    console.error('Error in p2p/create-session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}