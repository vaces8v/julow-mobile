const { execFileSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const androidDir = path.join(projectRoot, 'android');
const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

const defaultJbr =
  process.platform === 'win32'
    ? 'C:\\Program Files\\Android\\Android Studio\\jbr'
    : '/Applications/Android Studio.app/Contents/jbr/Contents/Home';

function ensureJavaHome() {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    return;
  }

  if (fs.existsSync(defaultJbr)) {
    process.env.JAVA_HOME = defaultJbr;
    process.env.Path = `${path.join(defaultJbr, 'bin')}${path.delimiter}${process.env.Path ?? ''}`;
    console.log(`[android:fix] using JAVA_HOME=${defaultJbr}`);
    return;
  }

  console.warn('[android:fix] JAVA_HOME is not set. Install JDK 17+ or Android Studio JBR.');
}

const lockedBuildDirs = [
  path.join(projectRoot, 'node_modules', 'expo-modules-core', 'android', 'build'),
  path.join(projectRoot, 'node_modules', 'expo', 'android', 'build'),
  path.join(projectRoot, 'node_modules', 'react-native-nitro-modules', 'android', 'build'),
  path.join(projectRoot, 'node_modules', 'react-native-mmkv', 'android', 'build'),
  path.join(androidDir, 'build'),
  path.join(androidDir, 'app', 'build'),
  path.join(androidDir, 'app', '.cxx'),
];

function removeDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    console.log(`[android:fix] removed ${path.relative(projectRoot, dir)}`);
  } catch (error) {
    console.warn(`[android:fix] could not remove ${dir}: ${error.message}`);
  }
}

function runGradle(args) {
  if (!fs.existsSync(gradlew)) {
    return;
  }

  const options = {
    cwd: androidDir,
    stdio: 'inherit',
    timeout: 600_000,
    windowsHide: true,
    env: process.env,
  };

  if (process.platform === 'win32') {
    execSync(`"${gradlew}" ${args.join(' ')}`, { ...options, shell: true });
    return;
  }

  execFileSync(gradlew, args, options);
}

function stopGradle() {
  try {
    runGradle(['--stop']);
    console.log('[android:fix] stopped Gradle daemons');
  } catch {
    console.log('[android:fix] Gradle stop skipped');
  }
}

function generateNitroCodegen() {
  try {
    runGradle([':react-native-nitro-modules:generateCodegenArtifactsFromSchema']);
    console.log('[android:fix] nitro-modules codegen ready');
  } catch (error) {
    console.warn(`[android:fix] nitro-modules codegen failed: ${error.message}`);
  }
}

console.log('[android:fix] clearing Windows file locks before Android build...');
ensureJavaHome();
stopGradle();

for (const dir of lockedBuildDirs) {
  removeDir(dir);
}

generateNitroCodegen();

console.log('[android:fix] done');