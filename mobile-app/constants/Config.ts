import { Platform } from 'react-native';
// Standard Software Engineering Practice: Environment Detection     
// __DEV__ is true when running expo locally.
// It is false when you build the standalone APK/IPA or run in production mode.
const IS_PRODUCTION = !__DEV__;

export const Config = {
// 1. Change YOUR_LOCAL_IP to your actual machine IP (e.g. 192.168.1.13)
// 2. Change YOUR_RENDER_URL to your actual render .onrender.com URL
   API_URL: IS_PRODUCTION
     ? 'https://rider-web-api-2.onrender.com'
     : 'http://10.182.225.154:3001', // Note: Both use port 3001 now   
   GEOAPIFY_KEY: 'e981beca841349698124675a91674f3a',
};