const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

const cacheDirs = [
  path.join(projectRoot, '.expo'),
  path.join(projectRoot, 'node_modules', '.cache'),
  path.join(os.tmpdir(), 'metro-cache'),
  path.join('C:', 'Temp', 'metro-cache'),
];

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    console.log(`[metro:fix] removed ${dir}`);
  } catch (error) {
    console.warn(`[metro:fix] could not remove ${dir}:`, error.message);
  }
}

function removeNodeModulesAndroidBuildDirs() {
  const nodeModules = path.join(projectRoot, 'node_modules');
  if (!fs.existsSync(nodeModules)) return;

  const androidBuildPattern = `${path.sep}android${path.sep}build`;
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (full.includes(androidBuildPattern)) {
        removeDir(full);
        continue;
      }
      walk(full);
    }
  };

  walk(nodeModules);
}

for (const dir of cacheDirs) {
  removeDir(dir);
}

removeNodeModulesAndroidBuildDirs();

console.log('[metro:fix] done');
console.log('[metro:fix] stop the running Expo terminal (Ctrl+C), then restart with:');
console.log('  bun run start:metro');