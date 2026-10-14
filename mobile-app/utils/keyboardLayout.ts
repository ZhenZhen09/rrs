import { Platform } from 'react-native';

export function getMessagingKeyboardBehavior(platform: typeof Platform.OS = Platform.OS): {
  behavior: 'padding' | 'height';
  offset: number;
} {
  return platform === 'ios'
    ? { behavior: 'padding', offset: 88 }
    : { behavior: 'height', offset: 0 };
}
