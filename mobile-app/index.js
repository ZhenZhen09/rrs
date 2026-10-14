const { Platform } = require('react-native');
const { isRunningInExpoGo } = require('expo');

if (Platform.OS !== 'web' && !isRunningInExpoGo()) {
  const messagingApi = require('@react-native-firebase/messaging');
  const { createFirebaseMessagingClient } = require('./services/firebaseMessagingClient');
  const { registerFcmBackgroundHandler } = require('./services/registerFcmBackgroundHandler');
  const messaging = createFirebaseMessagingClient(messagingApi);
  registerFcmBackgroundHandler(Platform.OS, isRunningInExpoGo(), messaging);
}

require('expo-router/entry');
