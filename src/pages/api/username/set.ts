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
  
  if (req.method !== 'POST') {
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

  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Валидация формата
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ 
      error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' 
    });
  }

  try {
    // Проверить доступность username
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('custom_username', username)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking username availability:', checkError);
      throw checkError;
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Установить username
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        custom_username: username,
        has_custom_username: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('custom_username, name, avatar_url')
      .single();

    if (updateError) {
      console.error('Error updating username:', updateError);
      throw updateError;
    }

    res.status(200).json({
      success: true,
      message: 'Username set successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error in username/set:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}