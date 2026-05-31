/**
 * Generate Julow app icons with Android adaptive safe-zone padding.
 * Source: assets/images/logo.png (petal logo, same as splash / expo-assets branding)
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'images');
const SOURCE = path.join(ROOT, 'assets', 'images', 'logo.png');

/** Canvas size for iOS + Android adaptive foreground */
const CANVAS = 1024;
/** Logo max dimension as fraction of canvas (Android safe zone ~66%) */
const LOGO_SCALE = 0.558;
const LIGHT_BG = '#FFFFFF';
const DARK_BG = '#0b1020';

function parseHex(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    alpha: 1,
  };
}

async function loadTrimmedLogo() {
  return sharp(SOURCE).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
}

function computePlacement(logoWidth, logoHeight) {
  const maxLogoSize = Math.round(CANVAS * LOGO_SCALE);
  const scale = maxLogoSize / Math.max(logoWidth, logoHeight);
  const width = Math.round(logoWidth * scale);
  const height = Math.round(logoHeight * scale);
  return {
    width,
    height,
    left: Math.round((CANVAS - width) / 2),
    top: Math.round((CANVAS - height) / 2),
    maxLogoSize,
  };
}

async function resizeLogo(logoBuffer, placement) {
  return sharp(logoBuffer)
    .resize(placement.width, placement.height, { fit: 'inside' })
    .png()
    .toBuffer();
}

async function createForeground(resizedLogo, placement) {
  return sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resizedLogo, left: placement.left, top: placement.top }])
    .png()
    .toBuffer();
}

async function createThemedIcon(resizedLogo, placement, bgHex) {
  return sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: parseHex(bgHex),
    },
  })
    .composite([{ input: resizedLogo, left: placement.left, top: placement.top }])
    .png()
    .toBuffer();
}

/** White silhouette for Android 13+ themed / notification icons */
async function createMonochrome(resizedLogo, placement) {
  const alphaMask = await sharp(resizedLogo).ensureAlpha().extractChannel('alpha').toBuffer();

  const whiteSilhouette = await sharp({
    create: {
      width: placement.width,
      height: placement.height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .joinChannel(alphaMask)
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: whiteSilhouette, left: placement.left, top: placement.top }])
    .png()
    .toBuffer();
}

async function main() {
  const { data: logoBuffer, info } = await loadTrimmedLogo();
  const placement = computePlacement(info.width, info.height);
  const resizedLogo = await resizeLogo(logoBuffer, placement);

  const outputs = [
    ['android-icon-foreground.png', await createForeground(resizedLogo, placement)],
    ['icon-light.png', await createThemedIcon(resizedLogo, placement, LIGHT_BG)],
    ['icon-dark.png', await createThemedIcon(resizedLogo, placement, DARK_BG)],
    ['icon.png', await createThemedIcon(resizedLogo, placement, LIGHT_BG)],
    ['android-icon-monochrome.png', await createMonochrome(resizedLogo, placement)],
  ];

  for (const [name, buffer] of outputs) {
    const outPath = path.join(OUT_DIR, name);
    await sharp(buffer).toFile(outPath);
    const meta = await sharp(outPath).metadata();
    console.log(`✓ ${name} (${meta.width}x${meta.height})`);
  }

  console.log('\n--- Icon generation summary ---');
  console.log(`Source: ${path.relative(ROOT, SOURCE)}`);
  console.log(`Trimmed logo: ${info.width}x${info.height}`);
  console.log(`Placed logo: ${placement.width}x${placement.height} (${LOGO_SCALE * 100}% safe zone)`);
  console.log(`Padding: ${placement.left}px horizontal, ${placement.top}px vertical`);
  console.log(`Light bg: ${LIGHT_BG}, Dark bg: ${DARK_BG}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
