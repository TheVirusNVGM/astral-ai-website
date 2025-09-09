-- OAuth Applications table
CREATE TABLE IF NOT EXISTS oauth_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['profile'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth Authorization Codes table (temporary codes)
CREATE TABLE IF NOT EXISTS oauth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  state TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth Access Tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the ASTRAL-AI Launcher as a registered OAuth app
INSERT INTO oauth_apps (client_id, name, redirect_uri, scopes) 
VALUES ('astral-launcher', 'ASTRAL-AI Launcher', 'astral-ai://callback', ARRAY['profile', 'launcher'])
ON CONFLICT (client_id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS oauth_codes_code_idx ON oauth_codes(code);
CREATE INDEX IF NOT EXISTS oauth_codes_expires_at_idx ON oauth_codes(expires_at);
CREATE INDEX IF NOT EXISTS oauth_tokens_access_token_idx ON oauth_tokens(access_token);
CREATE INDEX IF NOT EXISTS oauth_tokens_user_id_idx ON oauth_tokens(user_id);

-- RLS (Row Level Security) policies
ALTER TABLE oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_apps ENABLE ROW LEVEL SECURITY;

-- Users can only see their own codes and tokens
CREATE POLICY "Users can view their own oauth codes" ON oauth_codes 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own oauth tokens" ON oauth_tokens 
  FOR SELECT USING (auth.uid() = user_id);

-- OAuth apps are publicly readable (for client validation)
CREATE POLICY "OAuth apps are publicly readable" ON oauth_apps 
  FOR SELECT TO authenticated, anon USING (true);

-- Cleanup function for expired codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
