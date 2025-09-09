-- ================================
-- ASTRAL-AI Complete Database Schema
-- ================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- USERS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- OAUTH TABLES
-- ================================

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

-- ================================
-- PROJECT TABLES (if needed)
-- ================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  minecraft_version TEXT NOT NULL,
  loader TEXT NOT NULL CHECK (loader IN ('fabric', 'forge', 'quilt', 'neoforge')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS oauth_codes_code_idx ON oauth_codes(code);
CREATE INDEX IF NOT EXISTS oauth_codes_expires_at_idx ON oauth_codes(expires_at);
CREATE INDEX IF NOT EXISTS oauth_codes_user_id_idx ON oauth_codes(user_id);
CREATE INDEX IF NOT EXISTS oauth_tokens_access_token_idx ON oauth_tokens(access_token);
CREATE INDEX IF NOT EXISTS oauth_tokens_user_id_idx ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);

-- ================================
-- ROW LEVEL SECURITY (RLS)
-- ================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ================================
-- RLS POLICIES
-- ================================

-- Users can view and update their own profile
CREATE POLICY "Users can view their own profile" ON users 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users 
  FOR UPDATE USING (auth.uid() = id);

-- Users can only see their own oauth codes and tokens
CREATE POLICY "Users can view their own oauth codes" ON oauth_codes 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own oauth tokens" ON oauth_tokens 
  FOR SELECT USING (auth.uid() = user_id);

-- OAuth apps are publicly readable (for client validation)
CREATE POLICY "OAuth apps are publicly readable" ON oauth_apps 
  FOR SELECT TO authenticated, anon USING (true);

-- Users can manage their own projects
CREATE POLICY "Users can view their own projects" ON projects 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON projects 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects 
  FOR DELETE USING (auth.uid() = user_id);

-- ================================
-- FUNCTIONS AND TRIGGERS
-- ================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to cleanup expired OAuth codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ================================
-- SEED DATA
-- ================================

-- Insert the ASTRAL-AI Launcher as a registered OAuth app
INSERT INTO oauth_apps (client_id, name, redirect_uri, scopes) 
VALUES ('astral-launcher', 'ASTRAL-AI Launcher', 'astral-ai://callback', ARRAY['profile', 'launcher'])
ON CONFLICT (client_id) DO UPDATE SET
  name = EXCLUDED.name,
  redirect_uri = EXCLUDED.redirect_uri,
  scopes = EXCLUDED.scopes;

-- ================================
-- ENABLE REALTIME (optional)
-- ================================
-- Uncomment if you want realtime subscriptions
-- ALTER PUBLICATION supabase_realtime ADD TABLE users;
-- ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- ================================
-- SUCCESS MESSAGE
-- ================================
DO $$
BEGIN
  RAISE NOTICE '✅ ASTRAL-AI Database Schema created successfully!';
  RAISE NOTICE '🔐 OAuth tables: oauth_apps, oauth_codes, oauth_tokens';
  RAISE NOTICE '👤 User management: users table with RLS';
  RAISE NOTICE '🎮 Project management: projects table';
  RAISE NOTICE '🚀 Ready for ASTRAL-AI Launcher integration!';
END
$$;
