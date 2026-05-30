# Windows: окружение и скрипты (julow-mobile)

## Быстрый старт

```powershell
cd D:\project\julow\julow-mobile
powershell -ExecutionPolicy Bypass -File .\scripts\set-android-dev-env.ps1
bun run start:metro
```

При падении Metro после сборки Android:

```powershell
bun run metro:fix
bun run start:metro
```

## Metro и Gradle

`metro.config.js` игнорирует `node_modules/**/android/build` (и `.gradle`, `.cxx`), чтобы FallbackWatcher не падал с ENOENT, когда Gradle пересобирает нативные модули.

## Переменные окружения (User, без админа)

Скрипт `scripts/set-android-dev-env.ps1` один раз прописывает в профиль пользователя:

| Переменная | Значение |
|------------|----------|
| JAVA_HOME | `C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot` |
| ANDROID_HOME | `%LOCALAPPDATA%\Android\Sdk` |
| Path | `%JAVA_HOME%\bin`, `%USERPROFILE%\.bun\bin`, `%ANDROID_HOME%\platform-tools`, `%ANDROID_HOME%\emulator`, каталог `node.exe` |

**Нужен новый терминал** после первого запуска скрипта, чтобы PATH подхватился.

## PowerShell ExecutionPolicy

| Scope | Рекомендация | Админ |
|-------|--------------|-------|
| CurrentUser `RemoteSigned` | Достаточно для `.ps1` в проекте | Нет |
| LocalMachine | Опционально для всех пользователей | Да |

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
Get-ExecutionPolicy -List
```

Скрипты npm (`start:metro`, `android`) уже вызывают `powershell -ExecutionPolicy Bypass -File ...`.

## Разблокировка скриптов

```powershell
Get-ChildItem .\scripts\*.ps1 | Unblock-File
```

## Только с правами администратора

- `Set-ExecutionPolicy -Scope LocalMachine -ExecutionPolicy RemoteSigned`
## Android: react-native-mmkv / nitro-modules

`react-native-mmkv` depends on `react-native-nitro-modules`. Autolinking expects generated JNI under `node_modules/react-native-nitro-modules/android/build/generated/source/codegen/jni/`. If that folder is missing, CMake fails with `react_codegen_NitroModulesSpec`.

**Fix:** keep `react-native-nitro-modules` as a direct dependency (same line as MMKV, e.g. `0.35.9`). Before a clean build, run:

```powershell
bun run android:fix
```

That script clears stale `android/app/.cxx` / module `android/build` dirs and runs `:react-native-nitro-modules:generateCodegenArtifactsFromSchema`.

Manual codegen only:

```powershell
cd android
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
.\gradlew.bat :react-native-nitro-modules:generateCodegenArtifactsFromSchema
```
