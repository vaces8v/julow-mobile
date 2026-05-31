# App Icons (Julow Mobile)

## Source

- **Logo:** `assets/images/logo.png` — petal logo (same graphic as `expo-assets/splash-icon.png`, high-res clean version used on splash screen)
- **Regenerate:** `node scripts/generate-app-icons.mjs`

## Safe zone padding

| Parameter | Value |
|-----------|-------|
| Canvas | 1024×1024 px |
| Logo max size | **55.8%** of canvas (571�509 px placed) |
| Horizontal padding | 227 px each side |
| Vertical padding | 258 px top/bottom |
| Android safe zone | ~66% center — logo kept at ~56% to avoid clipping on circle/squircle masks |

## Output files

| File | Use |
|------|-----|
| `icon-light.png` | Default app icon, iOS light |
| `icon-dark.png` | iOS dark (`#0b1020` background) |
| `icon.png` | Alias of light (notifications fallback) |
| `android-icon-foreground.png` | Adaptive icon foreground (transparent) |
| `android-icon-monochrome.png` | Android 13+ themed / notification icon |
| `android-icon-background.png` | Legacy (unused; `backgroundColor` in app.json) |

## app.json

- `icon` → `icon-light.png`
- `ios.icon.light` / `ios.icon.dark` → light & dark variants
- `android.adaptiveIcon.foregroundImage` → padded transparent foreground
- `android.adaptiveIcon.backgroundColor` → `#FFFFFF` (light launcher)
- `android.adaptiveIcon.monochromeImage` → white silhouette for themed icons
