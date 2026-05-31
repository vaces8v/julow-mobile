# OAuth setup для JULOW (web + mobile)

Документ описывает единый OAuth flow для `julow-web`, `julow-mobile` и `julow_backend` с HTTPS callback-страницей для мобилки.

## 0) Что обязательно помнить

1. В консоли провайдеров вставляются только redirect URI из списка ниже.
2. `julowmobile://oauth/callback` не вставляется в Google/GitHub/Yandex. Это внутренний deep link между браузером и приложением.
3. `redirect_uri` должен совпадать побайтно: в authorize-запросе, в provider console и в code exchange.

Разрешенные redirect URI:

```text
http://localhost:3000/oauth/callback
https://julow.ru/oauth/callback
https://julow.ru/oauth/mobile-callback
```

Внутренний URI (только для app/browser bridge, НЕ для provider console):

```text
julowmobile://oauth/callback
```

---

## 1) Архитектура flow

| Клиент | Запрос authorize | redirect_uri у провайдера | Возврат в приложение |
|--------|------------------|---------------------------|----------------------|
| `julow-web` | `GET /api/auth/oauth-authorize` | `http://localhost:3000/oauth/callback` или `https://julow.ru/oauth/callback` | не нужен |
| `julow-mobile` | `GET /auth/oauth/oauth_{provider}/authorize` | `https://julow.ru/oauth/mobile-callback` | web bridge делает `window.location.replace("julowmobile://oauth/callback?...")` |

---

## 2) Google Cloud Console (клик-за-кликом)

Открыть в браузере:

- `https://console.cloud.google.com/apis/credentials`

Пошагово:

1. Выберите нужный GCP Project в верхнем селекторе проекта.
2. Перейдите в меню `APIs & Services` → `Credentials`.
3. Нажмите `+ CREATE CREDENTIALS` → `OAuth client ID`.
4. В поле `Application type` выберите `Web application` (обязательно).
5. В блоке `Authorized redirect URIs` нажмите `+ ADD URI` и добавьте по одному:
   - `http://localhost:3000/oauth/callback`
   - `https://julow.ru/oauth/callback`
   - `https://julow.ru/oauth/mobile-callback`
6. Нажмите `CREATE`.
7. В модальном окне скопируйте:
   - `Client ID`
   - `Client Secret`
8. Вставьте в `julow_backend/.env`:

```env
OAUTH_GOOGLE_CLIENT_ID=<Client ID из Google>
OAUTH_GOOGLE_CLIENT_SECRET=<Client Secret из Google>
```

Что нельзя вставлять в Google:

- `julowmobile://oauth/callback` (это не web redirect URI и приведет к mismatch).

---

## 3) GitHub OAuth App (клик-за-кликом)

Открыть в браузере:

- `https://github.com/settings/developers`

Пошагово:

1. В левой панели: `OAuth Apps`.
2. Нажмите `New OAuth App`.
3. Заполните поля:
   - `Application name`: например `Julow OAuth (prod web)` или `Julow OAuth (mobile bridge)`
   - `Homepage URL`: `https://julow.ru`
   - `Authorization callback URL`: один callback URL для этого приложения
4. Нажмите `Register application`.
5. В карточке приложения нажмите `Generate a new client secret`.
6. Скопируйте:
   - `Client ID`
   - `Client secret`
7. Вставьте в `julow_backend/.env`:

```env
OAUTH_GITHUB_CLIENT_ID=<Client ID из GitHub OAuth App>
OAUTH_GITHUB_CLIENT_SECRET=<Client Secret из GitHub OAuth App>
```

Ограничение GitHub по callback URL:

- В классическом `OAuth App` GitHub обычно использует одно поле `Authorization callback URL`.
- Если вам нужны разные redirect URI (dev/web/mobile), рекомендуемый вариант: отдельные OAuth Apps для каждой среды/цели:
  - App 1: `http://localhost:3000/oauth/callback` (dev web)
  - App 2: `https://julow.ru/oauth/callback` (prod web)
  - App 3: `https://julow.ru/oauth/mobile-callback` (mobile bridge, если нужен отдельный)

Что нельзя вставлять в GitHub:

- `julowmobile://oauth/callback`.

---

## 4) Yandex OAuth (клик-за-кликом)

Открыть в браузере:

- `https://oauth.yandex.com/client/new`

Пошагово:

1. Создайте новое приложение OAuth.
2. В секции платформ выберите `Web-сервисы` (или `Web services`, если англ. UI).
3. В поле `Redirect URI` (иногда отображается как `Callback URI`) добавьте:
   - `http://localhost:3000/oauth/callback`
   - `https://julow.ru/oauth/callback`
   - `https://julow.ru/oauth/mobile-callback`
4. В секции прав (scopes/permissions) включите:
   - `login:email`
   - `login:info`
5. Сохраните приложение и скопируйте:
   - `Client ID`
   - `Client Secret`
6. Вставьте в `julow_backend/.env`:

```env
OAUTH_YANDEX_CLIENT_ID=<Client ID из Yandex OAuth>
OAUTH_YANDEX_CLIENT_SECRET=<Client Secret из Yandex OAuth>
```

Что нельзя вставлять в Yandex:

- `julowmobile://oauth/callback`.

---

## 5) Copy-paste блоки переменных окружения

### `julow_backend/.env`

```env
APP_BASE_URL=https://backend.julow.ru
FRONTEND_BASE_URL=https://julow.ru

OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_GITHUB_CLIENT_ID=
OAUTH_GITHUB_CLIENT_SECRET=
OAUTH_YANDEX_CLIENT_ID=
OAUTH_YANDEX_CLIENT_SECRET=
```

### `julow-web/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=https://backend.julow.ru/api/v1
NEXT_PUBLIC_WS_BASE_URL=wss://backend.julow.ru
NEXT_PUBLIC_APP_URL=https://julow.ru
```

### `julow-mobile/.env`

```env
EXPO_PUBLIC_API_BASE_URL=https://backend.julow.ru/api/v1
EXPO_PUBLIC_OAUTH_REDIRECT_URI=https://julow.ru/oauth/mobile-callback
```

### `julow-mobile` EAS Secrets (copy-paste)

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://backend.julow.ru/api/v1
eas secret:create --scope project --name EXPO_PUBLIC_OAUTH_REDIRECT_URI --value https://julow.ru/oauth/mobile-callback
eas secret:list --scope project
```

---

## 6) Быстрый smoke-check после настройки

1. Убедитесь, что в `julow_backend/.env` заполнены все `OAUTH_*`.
2. Убедитесь, что `EXPO_PUBLIC_OAUTH_REDIRECT_URI=https://julow.ru/oauth/mobile-callback` в mobile env/EAS.
3. На устройстве откройте логин и нажмите Google/GitHub/Yandex.
4. Ожидаемый путь:
   - провайдер авторизует пользователя,
   - открывается `https://julow.ru/oauth/mobile-callback`,
   - страница редиректит в `julowmobile://oauth/callback?...`,
   - приложение завершает вход через `POST /auth/login/oauth`.

---

## 7) Troubleshooting (с точными сообщениями)

### Ошибки provider console / callback

- `Error 400: redirect_uri_mismatch` (Google)
  - Причина: `redirect_uri` не добавлен в `Authorized redirect URIs` или отличается символами.
  - Проверка: сравните URI побайтно, без лишнего `/` в конце.

- `The redirect_uri is not associated with this application.` (GitHub)
  - Причина: у OAuth App в `Authorization callback URL` указан другой URL.
  - Решение: исправить callback URL или использовать отдельный OAuth App для текущей среды.

- `invalid_request` / ошибка про `redirect_uri` (Yandex)
  - Причина: URI не добавлен в поле `Redirect URI`.
  - Решение: добавить все нужные URI в список приложения.

### Ошибки приложения / backend

- `Missing authorize_url`
  - Где: mobile/web при запросе authorize URL.
  - Причина: backend вернул некорректный ответ (обычно проблема с `OAUTH_*`).

- `OAuth cancelled`
  - Где: mobile (`src/lib/oauth.ts`).
  - Причина: пользователь закрыл окно авторизации.

- `OAuth session failed`
  - Где: mobile (`src/lib/oauth.ts`).
  - Причина: браузерная сессия не вернула валидный success callback.

- `No authorization code in callback`
  - Где: mobile (`src/lib/oauth.ts`) или web callback.
  - Причина: провайдер вернул callback без `code`.

- `OAuth-провайдер отклонил вход: ...`
  - Где: `julow-web/src/app/oauth/callback/page.tsx`.
  - Причина: провайдер вернул `error`/`error_description` (например, user cancelled).
