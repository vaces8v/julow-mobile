const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">10.0.2.2</domain>
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">127.0.0.1</domain>
  </domain-config>
</network-security-config>
`;

function withAndroidNetworkSecurity(config) {
  return withAndroidManifest(config, async (config) => {
    const mod = config.modResults;
    const mainApp = AndroidConfig.Manifest.getMainApplicationOrThrow(mod);

    mainApp.$['android:usesCleartextTraffic'] = 'true';
    mainApp.$['android:networkSecurityConfig'] = '@xml/network_security_config';

    const xmlDir = path.join(
      config.modRequest.platformProjectRoot,
      'app/src/main/res/xml',
    );
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), NETWORK_SECURITY_CONFIG);

    return config;
  });
}

module.exports = withAndroidNetworkSecurity;
