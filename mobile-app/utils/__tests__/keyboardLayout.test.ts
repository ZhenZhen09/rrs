import { getMessagingKeyboardBehavior } from '../keyboardLayout';

describe('getMessagingKeyboardBehavior', () => {
  it('uses padding on iOS and height resizing on Android', () => {
    expect(getMessagingKeyboardBehavior('ios')).toEqual({ behavior: 'padding', offset: 88 });
    expect(getMessagingKeyboardBehavior('android')).toEqual({ behavior: 'height', offset: 0 });
  });
});
