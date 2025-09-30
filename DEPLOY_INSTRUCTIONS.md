# 🚀 Инструкция по деплою исправлений БД

## ✅ Что было исправлено:

### 1. **База данных** (`db_migration_final.sql`)
- ✅ Добавлен UNIQUE constraint на email
- ✅ Добавлены Foreign Keys с CASCADE
- ✅ Добавлен индекс `idx_unique_friend_pair` (одна запись на пару друзей)
- ✅ Добавлены индексы для производительности
- ✅ Добавлены CHECK constraints (запрет self-friendship)
- ✅ Добавлены триггеры для auto-update `updated_at`

### 2. **API Friends** (3 файла исправлены)

#### `src/pages/api/friends/request.ts`
- ✅ **Строка 199**: Теперь создаём ОДНУ запись вместо двух при принятии запроса
- ✅ **Строка 91**: Проверка existingFriend теперь ищет в обе стороны

#### `src/pages/api/friends/list.ts`
- ✅ **Строка 52**: Запрос друзей теперь ищет в обе стороны (`.or()`)
- ✅ **Строки 60-111**: Логика получения друзей переписана для работы с одной записью

#### `src/pages/api/friends/remove.ts`
- ✅ **Строка 52**: Проверка friendship теперь ищет в обе стороны

---

## 📋 Шаги для деплоя:

### Шаг 1: Деплой изменений в API (сайт)
```bash
cd C:\astral-ai-website
git add .
git commit -m "fix: friends system - single record per friendship pair"
git push
```

### Шаг 2: Запуск миграции БД (уже выполнено ✅)
Миграция `db_migration_final.sql` уже применена в Supabase Dashboard.

### Шаг 3: Тестирование
1. Открой сайт в двух браузерах (или incognito)
2. Войди под разными аккаунтами
3. Отправь запрос в друзья с одного аккаунта
4. Прими запрос на другом аккаунте
5. ✅ Проверь, что оба видят друг друга в списке друзей

---

## 🎯 Результат:

### До исправления:
```sql
-- Две записи на пару друзей
friends:
  1. user_id: A, friend_id: B
  2. user_id: B, friend_id: A  ❌ Дубликат!
```

### После исправления:
```sql
-- Одна запись на пару друзей
friends:
  1. user_id: A, friend_id: B  ✅

-- Индекс idx_unique_friend_pair нормализует пару через LEAST/GREATEST
-- Поиск идёт в обе стороны через .or() запросы
```

---

## ⚠️ Возможные проблемы:

1. **"Already friends" при добавлении**
   - Причина: В БД уже есть запись
   - Решение: Проверь через SQL Editor, удали дубликаты

2. **Друзей не видно в списке**
   - Причина: Кэш в браузере
   - Решение: Ctrl+Shift+R (hard refresh)

3. **500 error при принятии запроса**
   - Причина: Deployment ещё не завершён
   - Решение: Подожди 1-2 минуты после push

---

## 🧪 SQL для проверки:

```sql
-- Проверить записи в friends
SELECT 
  user_id, 
  friend_id, 
  created_at 
FROM friends;

-- Проверить дубликаты (должно вернуть 0 строк)
SELECT 
  LEAST(user_id, friend_id) as user1,
  GREATEST(user_id, friend_id) as user2,
  COUNT(*) as count
FROM friends
GROUP BY LEAST(user_id, friend_id), GREATEST(user_id, friend_id)
HAVING COUNT(*) > 1;
```

---

## ✅ Готово!
После деплоя система друзей будет работать корректно! 🎉