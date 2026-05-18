import Constants from 'expo-constants';

const debuggerHost = Constants.expoConfig?.hostUri;
const localhost = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';

export const CONFIG = {
  API_URL: `http://${localhost}:3001/api`,
  SOCKET_URL: `http://${localhost}:3001`,
};
