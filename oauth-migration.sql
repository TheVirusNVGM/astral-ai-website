-- ================================
-- OAUTH MIGRATION для существующей БД
-- ================================

-- 1. OAuth Applications table
CREATE TABLE IF NOT EXISTS oauth_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['profile'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. OAuth Authorization Codes table (temporary codes)
CREATE TABLE IF NOT EXISTS oauth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  state TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. OAuth Access Tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ================================
-- ИНДЕКСЫ для производительности
-- ================================
CREATE INDEX IF NOT EXISTS oauth_codes_code_idx ON oauth_codes(code);
CREATE INDEX IF NOT EXISTS oauth_codes_expires_at_idx ON oauth_codes(expires_at);
CREATE INDEX IF NOT EXISTS oauth_codes_user_id_idx ON oauth_codes(user_id);
CREATE INDEX IF NOT EXISTS oauth_tokens_access_token_idx ON oauth_tokens(access_token);
CREATE INDEX IF NOT EXISTS oauth_tokens_user_id_idx ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS oauth_apps_client_id_idx ON oauth_apps(client_id);

-- ================================
-- RLS (Row Level Security)
-- ================================
ALTER TABLE oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_apps ENABLE ROW LEVEL SECURITY;

-- ================================
-- RLS ПОЛИТИКИ
-- ================================

-- Users can only see their own oauth codes and tokens
CREATE POLICY "Users can view their own oauth codes" ON oauth_codes 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own oauth tokens" ON oauth_tokens 
  FOR SELECT USING (auth.uid() = user_id);

-- OAuth apps are publicly readable (for client validation)
CREATE POLICY "OAuth apps are publicly readable" ON oauth_apps 
  FOR SELECT TO authenticated, anon USING (true);

-- ================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ================================

-- Function to update updated_at timestamp (если еще не создана)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for oauth_apps updated_at
CREATE TRIGGER oauth_apps_updated_at 
  BEFORE UPDATE ON oauth_apps 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to cleanup expired OAuth codes
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_codes WHERE expires_at < timezone('utc'::text, now());
  RAISE NOTICE 'Cleaned up % expired OAuth codes', ROW_COUNT;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- SEED DATA - Регистрируем ASTRAL-AI Launcher
-- ================================
INSERT INTO oauth_apps (client_id, name, redirect_uri, scopes) 
VALUES ('astral-launcher', 'ASTRAL-AI Launcher', 'astral-ai://callback', ARRAY['profile', 'launcher'])
ON CONFLICT (client_id) DO UPDATE SET
  name = EXCLUDED.name,
  redirect_uri = EXCLUDED.redirect_uri,
  scopes = EXCLUDED.scopes,
  updated_at = timezone('utc'::text, now());

-- ================================
-- ПРОВЕРКА И SUCCESS MESSAGE
-- ================================

-- Проверяем что всё создалось
DO $$
DECLARE
  oauth_tables_count INT;
BEGIN
  SELECT COUNT(*) INTO oauth_tables_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('oauth_apps', 'oauth_codes', 'oauth_tokens');
  
  IF oauth_tables_count = 3 THEN
    RAISE NOTICE '✅ OAuth migration completed successfully!';
    RAISE NOTICE '📋 Created tables: oauth_apps, oauth_codes, oauth_tokens';
    RAISE NOTICE '🔐 RLS policies enabled';
    RAISE NOTICE '📈 Performance indexes created';
    RAISE NOTICE '🚀 ASTRAL-AI Launcher registered as OAuth app';
    RAISE NOTICE '🎯 Ready for OAuth Authorization Code Flow!';
  ELSE
    RAISE EXCEPTION 'Migration failed: only % OAuth tables created', oauth_tables_count;
  END IF;
END;
$$;

-- Показать финальное состояние таблиц
SELECT 
  table_name,
  (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text::int AS row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
