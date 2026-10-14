import appConfig from '../../app.json';
import appPackage from '../../package.json';
import { applyNotificationColorConflictFix } from '../../plugins/withFcmNotificationColorManifest';

const config = appConfig.expo as any;

describe('Firebase Cloud Messaging native configuration', () => {
  it('uses the custom entry point that registers background handling before Expo Router', () => {
    expect(appPackage.main).toBe('index.js');
  });

  it('keeps Firebase app and messaging config plugins enabled', () => {
    const plugins = config.plugins.map((plugin: string | [string, unknown]) =>
      Array.isArray(plugin) ? plugin[0] : plugin,
    );

    expect(plugins).toContain('@react-native-firebase/app');
    expect(plugins).toContain('@react-native-firebase/messaging');
    expect(config.android.googleServicesFile).toBe('./google-services.json');
    expect(plugins.indexOf('./plugins/withFcmNotificationColorManifest'))
      .toBeLessThan(plugins.indexOf('expo-notifications'));
  });

  it('marks Expo notification color as the authoritative FCM manifest resource', () => {
    const manifest: any = {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      application: [{
        'meta-data': [{
          $: {
            'android:name': 'com.google.firebase.messaging.default_notification_color',
            'android:resource': '@color/notification_icon_color',
          },
        }],
      }],
    };

    applyNotificationColorConflictFix(manifest);

    expect(manifest.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
    expect(manifest.application[0]['meta-data'][0].$['tools:replace']).toBe('android:resource');
  });

  it('keeps iOS push configuration out of this Android-only rollout', () => {
    expect(config.ios.bundleIdentifier).toBe('com.hon01.cfarss');
    expect(config.ios.entitlements?.['aps-environment']).toBeUndefined();
    expect(config.ios.infoPlist.UIBackgroundModes).toBeUndefined();
  });
});
