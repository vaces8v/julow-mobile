const {
  AndroidConfig,
  withGradleProperties,
  withSettingsGradle,
  withProjectBuildGradle,
} = require('expo/config-plugins');

const { updateAndroidBuildProperty } = AndroidConfig.BuildProperties;

const GRADLE_PROPS = {
  newArchEnabled: 'false',
  'org.gradle.parallel': 'false',
  'org.gradle.workers.max': '1',
  'org.gradle.vfs.watch': 'false',
  'org.gradle.configureondemand': 'false',
  'org.gradle.java.installations.auto-download': 'false',
};

const ALIYUN_REPOS = [
  "    maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }",
  "    maven { url 'https://maven.aliyun.com/repository/google' }",
  "    maven { url 'https://maven.aliyun.com/repository/public' }",
];

function upsertGradleProperty(props, key, value) {
  return updateAndroidBuildProperty(props, key, value);
}

function ensureAliyunMirrors(contents) {
  if (contents.includes('maven.aliyun.com')) {
    return contents;
  }

  const pluginReposNeedle = 'pluginManagement {';
  const pluginReposIndex = contents.indexOf(pluginReposNeedle);
  if (pluginReposIndex === -1) {
    return contents;
  }

  const repositoriesNeedle = 'repositories {';
  const repositoriesIndex = contents.indexOf(repositoriesNeedle, pluginReposIndex);
  if (repositoriesIndex === -1) {
    return contents;
  }

  const insertAt = repositoriesIndex + repositoriesNeedle.length;
  return (
    contents.slice(0, insertAt) +
    '\n' +
    ALIYUN_REPOS.join('\n') +
    contents.slice(insertAt)
  );
}

function ensureAliyunProjectRepos(contents) {
  if (contents.includes("maven.aliyun.com/repository/google'")) {
    return contents;
  }

  const allProjectsNeedle = 'allprojects {';
  const allProjectsIndex = contents.indexOf(allProjectsNeedle);
  if (allProjectsIndex === -1) {
    return contents;
  }

  const repositoriesNeedle = 'repositories {';
  const repositoriesIndex = contents.indexOf(repositoriesNeedle, allProjectsIndex);
  if (repositoriesIndex === -1) {
    return contents;
  }

  const insertAt = repositoriesIndex + repositoriesNeedle.length;
  const repoBlock = [
    "    maven { url 'https://maven.aliyun.com/repository/google' }",
    "    maven { url 'https://maven.aliyun.com/repository/public' }",
  ].join('\n');

  return contents.slice(0, insertAt) + '\n' + repoBlock + contents.slice(insertAt);
}

function withAndroidBuildFix(config) {
  config = withGradleProperties(config, (config) => {
    let props = config.modResults;
    for (const [key, value] of Object.entries(GRADLE_PROPS)) {
      props = upsertGradleProperty(props, key, value);
    }
    config.modResults = props;
    return config;
  });

  config = withSettingsGradle(config, (config) => {
    config.modResults.contents = ensureAliyunMirrors(config.modResults.contents);
    return config;
  });

  config = withProjectBuildGradle(config, (config) => {
    config.modResults.contents = ensureAliyunProjectRepos(config.modResults.contents);
    return config;
  });

  return config;
}

module.exports = withAndroidBuildFix;
