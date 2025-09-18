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

  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Валидация формата
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ 
      available: false,
      error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores'
    });
  }

  try {
    // Проверить доступность
    const { data: existingUser, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('custom_username', username)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking username:', error);
      throw error;
    }

    const available = !existingUser;

    res.status(200).json({
      available,
      username,
      message: available 
        ? 'Username is available!' 
        : 'Username is already taken'
    });

  } catch (error) {
    console.error('Error in username/check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}