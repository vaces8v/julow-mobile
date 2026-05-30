# OAuth и QR-вход JULOW (production)

Пошаговая настройка **Google**, **GitHub**, **Yandex** для веба, мобильного приложения и бэкенда. Один и тот же FastAPI-бэкенд (`julow_backend`) обслуживает оба клиента; отличается только `redirect_uri`.

## Архитектура

| Клиент | Authorize | Callback `redirect_uri` | Обмен code → JWT |
|--------|-----------|-------------------------|------------------|
| **Web** (`julow-web`) | BFF `GET /api/auth/oauth-authorize` → backend | `https://<домен>/oauth/callback` | BFF `POST /api/auth/oauth-login` → cookies |
| **Mobile** (`julow-mobile`) | `GET /auth/oauth/oauth_{provider}/authorize` | `julowmobile://oauth/callback` | `POST /auth/login/oauth` → SecureStore |

Схема приложения: **`julowmobile`** (`app.json` → `expo.scheme`).

---

## Mobile production APK — plug-and-play после деплоя backend

Когда backend задеплоен с `OAUTH_*` и Redis, **мобильный код менять не нужно**. Остаётся:

### 1. Сборка APK (один раз или при смене URL API)

| Переменная | Где | Значение |
|------------|-----|----------|
| `EXPO_PUBLIC_API_BASE_URL` | EAS Secrets / `.env` при `eas build` | `https://backend.julow.ru/api/v1` |

Это **единственная** переменная, нужная мобилке для OAuth. Секреты провайдеров в APK не попадают.

> Опционально только для **Android-эмулятора в dev**: `EXPO_PUBLIC_ANDROID_EMULATOR_API_BASE_URL` — не нужна для release APK.

### 2. Зарегистрировать в консолях провайдеров (точно, побайтно)

Во **всех трёх** консолях добавьте **один и тот же** callback:

```
julowmobile://oauth/callback
```

| Провайдер | Где добавить |
|-----------|--------------|
| Google | OAuth 2.0 Client → **Authorized redirect URIs** |
| GitHub | OAuth App → **Authorization callback URL** (один URL на приложение — см. §2) |
| Yandex | Приложение → **Redirect URI** |

Дополнительно для Google release APK (рекомендуется): Android-клиент с package `com.anonymous.julowmobile` и SHA-1 release keystore — см. §1 п.4.

### 3. На backend (не в мобилке)

```env
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
OAUTH_GITHUB_CLIENT_ID=...
OAUTH_GITHUB_CLIENT_SECRET=...
OAUTH_YANDEX_CLIENT_ID=...
OAUTH_YANDEX_CLIENT_SECRET=...
```

### 4. Проверка на устройстве

1. Установить release APK с prod `EXPO_PUBLIC_API_BASE_URL`.
2. Экран входа → Google / GitHub / Яндекс.
3. Браузер провайдера → возврат в приложение → главный экран (JWT в SecureStore).

Типичные ошибки: `redirect_uri_mismatch` (URI в консоли ≠ `julowmobile://oauth/callback`), пустой `authorize_url` (нет `OAUTH_*` на backend).

---

## 1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **OAuth 2.0 Client ID**.
2. Тип: **Web application** (тот же client_id/secret, что в backend `.env`).
3. **Authorized redirect URIs** (все, что реально используются):

   | Среда | URI |
   |-------|-----|
   | Web dev | `http://localhost:3000/oauth/callback` |
   | Web prod | `https://app.julow.ru/oauth/callback` |
   | Mobile (dev + prod) | `julowmobile://oauth/callback` |

4. Для **release APK** (рекомендуется дополнительно): клиент типа **Android** с package `com.anonymous.julowmobile` и SHA-1 **release** keystore (EAS credentials / `keytool -list -v -keystore ...`). Web client с custom scheme часто достаточен, если `julowmobile://oauth/callback` добавлен в redirect URIs.

5. Скопируйте **Client ID** и **Client Secret** в backend:

```env
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
```

---

## 2. GitHub OAuth App

1. [GitHub → Developer settings → OAuth Apps](https://github.com/settings/developers) → **New OAuth App**.
2. **Authorization callback URL** — по одному приложению на среду или несколько URL (GitHub — одно поле; для prod укажите основной, для dev — отдельное OAuth App или тот же URL если совпадает):

   | Среда | Callback |
   |-------|----------|
   | Web dev | `http://localhost:3000/oauth/callback` |
   | Web prod | `https://app.julow.ru/oauth/callback` |
   | Mobile | `julowmobile://oauth/callback` |

   > GitHub допускает только **один** callback URL на приложение. Для dev/prod/mobile часто создают **2–3 OAuth Apps** с одними scopes, либо используют prod URL везде.

3. Backend:

```env
OAUTH_GITHUB_CLIENT_ID=...
OAUTH_GITHUB_CLIENT_SECRET=...
```

---

## 3. Yandex OAuth

1. [oauth.yandex.com](https://oauth.yandex.com/) → создать приложение.
2. Права: **login:email**, **login:info** (как в backend scope).
3. **Redirect URI**:

   | Среда | URI |
   |-------|-----|
   | Web dev | `http://localhost:3000/oauth/callback` |
   | Web prod | `https://app.julow.ru/oauth/callback` |
   | Mobile | `julowmobile://oauth/callback` |

4. Backend:

```env
OAUTH_YANDEX_CLIENT_ID=...
OAUTH_YANDEX_CLIENT_SECRET=...
```

---

## 4. Переменные окружения по репозиториям

### `julow_backend` (`.env`)

```env
APP_BASE_URL=https://backend.julow.ru
FRONTEND_BASE_URL=https://app.julow.ru

OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_GITHUB_CLIENT_ID=
OAUTH_GITHUB_CLIENT_SECRET=
OAUTH_YANDEX_CLIENT_ID=
OAUTH_YANDEX_CLIENT_SECRET=

REDIS_HOST=...   # обязателен для QR login
```

CORS: добавьте origin веб-приложения, например `https://app.julow.ru`.

### `julow-web` (`.env.local` / deploy)

```env
BACKEND_URL=https://backend.julow.ru/api/v1
NEXT_PUBLIC_API_BASE_URL=https://backend.julow.ru/api/v1
NEXT_PUBLIC_WS_BASE_URL=wss://backend.julow.ru
NEXT_PUBLIC_APP_URL=https://app.julow.ru
```

OAuth-секреты **только на backend**; веб ходит через BFF (`/api/auth/oauth-*`).

### `julow-mobile` (`.env` / EAS Secrets)

```env
EXPO_PUBLIC_API_BASE_URL=https://backend.julow.ru/api/v1
```

Для OAuth **других env на мобилке нет**: `redirect_uri` зашит в коде (`julowmobile://oauth/callback`), схема — в `app.json`.

Для **EAS production** (`eas build --profile production`): задайте `EXPO_PUBLIC_API_BASE_URL` в [EAS Environment Variables](https://docs.expo.dev/eas/environment-variables/) — значение вшивается на этапе сборки.

---

## 5. QR login (production checklist)

См. также `docs/QR_LOGIN.md`.

| # | Действие |
|---|----------|
| 1 | Backend с Redis (`REDIS_*`) задеплоен |
| 2 | Endpoints: `POST /auth/qr/create`, `POST /auth/qr/confirm`, `GET /auth/qr/poll/{token}` |
| 3 | Web BFF: `/api/auth/qr/create`, `/api/auth/qr/poll/[token]` |
| 4 | `NEXT_PUBLIC_APP_URL` = публичный URL веба (QR: `https://app.julow.ru/login/qr?token=...`) |
| 5 | Mobile: `EXPO_PUBLIC_API_BASE_URL` → тот же backend |
| 6 | На телефоне: войти в аккаунт → Настройки → **Сканировать QR** (нативная камера, нужен rebuild после `expo-camera`) |
| 7 | Deep link `julow://qr-login?token=...` парсится в `src/lib/qr-login.ts` |

Без backend/Redis веб получит **502** на create/poll; confirm с телефона — **404**.

---

## 6. Тестирование release APK

1. Соберите production: `eas build -p android --profile production` (или локально `bunx expo run:android --variant release`).
2. Убедитесь, что в APK зашит prod API: лог при старте / проверка `EXPO_PUBLIC_API_BASE_URL`.
3. **OAuth**: на экране входа → Google / GitHub / Яндекс → браузер провайдера → возврат в приложение → главный экран.
4. Типичные ошибки:
   - `redirect_uri_mismatch` — URI не добавлен в консоль провайдера.
   - Пустой `authorize_url` / 400 — нет `OAUTH_*` на backend.
   - Сеть — эмулятор без прокси: см. `EXPO_PUBLIC_ANDROID_EMULATOR_API_BASE_URL` в `.env.example`.
5. **QR**: залогиньтесь на телефоне → откройте `https://app.julow.ru/login/qr` в браузере → сканируйте QR в приложении.

---

## 7. Redirect URI — сводка

```
Web dev:     http://localhost:3000/oauth/callback
Web prod:    https://app.julow.ru/oauth/callback
Mobile:      julowmobile://oauth/callback
```

`redirect_uri` при обмене code **должен побайтно совпадать** с тем, что был в запросе authorize (и зарегистрирован у провайдера).

---

## 8. Код (реализовано в репозитории)

| Компонент | Файлы |
|-----------|--------|
| Backend OAuth + Yandex | `julow_backend/.../oauth_adapter.py`, `oauth_settings.py`, DI `container.py` |
| Mobile flow | `src/lib/oauth.ts` (`MOBILE_OAUTH_REDIRECT_URI`), `src/lib/api-client.ts` (`fetchOAuthAuthorizeUrl`, `authOAuthLogin`) |
| UI | `src/app/login.tsx`, `src/contexts/auth-context.tsx` (`loginWithOAuth`) |
| Deep link | `app.json` (`scheme`, Android `intentFilters`), `src/app/oauth/callback.tsx` |
| Web + Yandex | `julow-web/.../auth-social-blocks.tsx`, BFF routes |

Подробности QR: `docs/QR_LOGIN.md`.
