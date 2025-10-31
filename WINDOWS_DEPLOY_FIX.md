# Fix для деплоя на Cloudflare Pages с Windows

## Проблема
`@cloudflare/next-on-pages` не работает на Windows нативно из-за bash команд.

## Решение 1: Git Integration (Рекомендуется)

### Шаги:
1. Push код в GitHub/GitLab
2. Зайди на https://dash.cloudflare.com
3. Workers & Pages → Create application → Pages → Connect to Git
4. Выбери репозиторий `astral-ai-website`
5. Build settings:
   - **Build command**: `npm run pages:build`
   - **Build output directory**: `.vercel/output/static`
   - **Root directory**: `/`
6. Environment variables (Settings → Environment variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = твой URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = твой ключ

После этого каждый push в main/master будет автоматически деплоиться.

## Решение 2: WSL (Windows Subsystem for Linux)

Если нужно локально деплоить:

1. Установи WSL:
   ```powershell
   wsl --install
   ```

2. Перезагрузи Windows

3. Открой WSL terminal и перейди в проект:
   ```bash
   cd /mnt/c/astral-ai-website
   ```

4. Установи зависимости:
   ```bash
   npm install
   ```

5. Задеплой:
   ```bash
   npm run pages:deploy
   ```

## Решение 3: GitHub Actions (CI/CD)

Создай файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run pages:build
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: astral-ai-website
          directory: .vercel/output/static
```

Добавь secrets в GitHub:
- `CLOUDFLARE_API_TOKEN` - API токен из Cloudflare
- `CLOUDFLARE_ACCOUNT_ID` - Account ID из Cloudflare

## Проверка домена

После деплоя:
1. Зайди в Workers & Pages → astral-ai-website → Custom domains
2. Добавь `astral-ai.online`
3. Cloudflare покажет DNS записи (CNAME)
4. Подожди 5-10 минут для propagation

## Важно!

- API routes работают только с Next.js (не со статическим экспортом)
- `output: 'export'` должен быть убран из `next.config.ts` ✅ (уже исправлено)
- Без `@cloudflare/next-on-pages` API routes не будут работать

