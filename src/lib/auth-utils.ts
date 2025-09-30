import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Проверяет токен и возвращает userId
 * Поддерживает как OAuth токены, так и Supabase auth токены
 */
export async function validateToken(token: string): Promise<string | null> {
  if (!token) {
    return null;
  }

  // Try OAuth token first
  const { data: oauthToken, error: oauthError } = await supabase
    .from('oauth_tokens')
    .select('user_id, expires_at')
    .eq('access_token', token)
    .single();
    
  if (oauthToken && !oauthError) {
    // Check if OAuth token is expired
    const now = new Date();
    const expiresAt = new Date(oauthToken.expires_at);
    
    if (now <= expiresAt) {
      console.log('✅ Valid OAuth token found');
      return oauthToken.user_id;
    } else {
      console.log('⏰ OAuth token expired');
      return null;
    }
  }

  // Fallback to Supabase auth token
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.log('❌ Invalid token (both OAuth and Supabase auth failed)');
      return null;
    }
    console.log('✅ Valid Supabase auth token found');
    return user.id;
  } catch (error) {
    console.log('❌ Token validation failed:', error);
    return null;
  }
}