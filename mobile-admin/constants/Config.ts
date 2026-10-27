import Constants from 'expo-constants';

const PRODUCTION_API_URL = 'https://rrs-vhgr.onrender.com/api'; 
const PRODUCTION_SOCKET_URL = 'https://rrs-vhgr.onrender.com';

const debuggerHost = Constants.expoConfig?.hostUri;
const localIp = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
const isDevelopment = __DEV__; 

export const CONFIG = {
  API_URL: isDevelopment ? `http://${localIp}:3001/api` : PRODUCTION_API_URL,
  SOCKET_URL: isDevelopment ? `http://${localIp}:3001` : PRODUCTION_SOCKET_URL,
};
