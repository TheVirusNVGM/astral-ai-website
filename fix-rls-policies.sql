-- ================================
-- FIX RLS POLICIES для OAuth таблиц
-- ================================

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can view their own oauth codes" ON oauth_codes;
DROP POLICY IF EXISTS "Users can view their own oauth tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "OAuth apps are publicly readable" ON oauth_apps;

-- ================================
-- OAUTH_CODES - полные права для своих записей
-- ================================

-- Пользователи могут создавать коды авторизации для себя
CREATE POLICY "Users can insert their own oauth codes" ON oauth_codes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователи могут просматривать свои коды авторизации
CREATE POLICY "Users can select their own oauth codes" ON oauth_codes 
  FOR SELECT USING (auth.uid() = user_id);

-- Пользователи могут удалять свои коды авторизации
CREATE POLICY "Users can delete their own oauth codes" ON oauth_codes 
  FOR DELETE USING (auth.uid() = user_id);

-- ================================
-- OAUTH_TOKENS - полные права для своих записей
-- ================================

-- Пользователи могут создавать токены для себя
CREATE POLICY "Users can insert their own oauth tokens" ON oauth_tokens 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователи могут просматривать свои токены
CREATE POLICY "Users can select their own oauth tokens" ON oauth_tokens 
  FOR SELECT USING (auth.uid() = user_id);

-- Пользователи могут удалять свои токены
CREATE POLICY "Users can delete their own oauth tokens" ON oauth_tokens 
  FOR DELETE USING (auth.uid() = user_id);

-- ================================
-- OAUTH_APPS - публично читаемые для валидации
-- ================================

-- OAuth приложения доступны всем для чтения (нужно для валидации client_id)
CREATE POLICY "OAuth apps are publicly readable" ON oauth_apps 
  FOR SELECT TO authenticated, anon USING (true);

-- ================================
-- СПЕЦИАЛЬНАЯ ПОЛИТИКА для сервера
-- ================================

-- Разрешаем серверным операциям (через service_role) работать с OAuth таблицами
-- Это нужно для API endpoints, которые работают с токенами

-- Для oauth_codes - разрешаем серверу все операции
CREATE POLICY "Service role can manage oauth codes" ON oauth_codes 
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Для oauth_tokens - разрешаем серверу все операции  
CREATE POLICY "Service role can manage oauth tokens" ON oauth_tokens 
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================
-- ПРОВЕРКА ПОЛИТИК
-- ================================

-- Показать все политики для OAuth таблиц
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('oauth_apps', 'oauth_codes', 'oauth_tokens')
ORDER BY tablename, policyname;

-- ================================
-- SUCCESS MESSAGE
-- ================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed for OAuth tables!';
  RAISE NOTICE '🔐 oauth_codes: INSERT/SELECT/DELETE for users';
  RAISE NOTICE '🔐 oauth_tokens: INSERT/SELECT/DELETE for users';
  RAISE NOTICE '🔐 oauth_apps: SELECT for everyone';
  RAISE NOTICE '🔓 service_role: ALL operations (for API endpoints)';
  RAISE NOTICE '🎯 Ready to test OAuth flow!';
END;
$$;
