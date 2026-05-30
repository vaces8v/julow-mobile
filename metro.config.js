// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Gradle deletes/transforms these dirs during native builds; watching them crashes Metro on Windows.
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList)
    ? existingBlockList
    : existingBlockList
      ? [existingBlockList]
      : []),
  /[\\/]node_modules[\\/].*[\\/]android[\\/]build([\\/].*)?$/,
  /[\\/]node_modules[\\/].*[\\/]android[\\/]\\.gradle([\\/].*)?$/,
  /[\\/]node_modules[\\/].*[\\/]android[\\/]\\.cxx([\\/].*)?$/,
];

// Windows can hit EMFILE during large bundles; fewer workers = fewer open files.
if (process.platform === 'win32') {
  config.maxWorkers = 2;
}

module.exports = withUniwindConfig(config, {
    cssEntryFile: './src/global.css',
    dtsFile: './uniwind-types.d.ts',
});