const { withAndroidManifest } = require('@expo/config-plugins');

const FCM_NOTIFICATION_COLOR = 'com.google.firebase.messaging.default_notification_color';

function applyNotificationColorConflictFix(manifest) {
  manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

  const app = manifest.application?.[0];
  const metadata = app?.['meta-data']?.find((entry) => entry.$?.['android:name'] === FCM_NOTIFICATION_COLOR);
  if (metadata) {
    metadata.$['tools:replace'] = 'android:resource';
  }

  return manifest;
}

function withFcmNotificationColorManifest(config) {
  return withAndroidManifest(config, (config) => {
    applyNotificationColorConflictFix(config.modResults.manifest);
    return config;
  });
}

module.exports = withFcmNotificationColorManifest;
module.exports.applyNotificationColorConflictFix = applyNotificationColorConflictFix;
