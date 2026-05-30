const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/** Force native manifest to match app.json `updates.enabled: false`. */
module.exports = function withDisableExpoUpdates(config) {
  return withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      app,
      'expo.modules.updates.ENABLED',
      'false',
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      app,
      'expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH',
      'NEVER',
    );
    return config;
  });
};
