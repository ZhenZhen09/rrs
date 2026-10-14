import { registerFcmBackgroundHandler } from '../registerFcmBackgroundHandler';

describe('FCM background handler registration', () => {
  it('registers before the app starts on native builds', () => {
    const setBackgroundMessageHandler = jest.fn();

    expect(registerFcmBackgroundHandler('android', false, { setBackgroundMessageHandler })).toBe(true);
    expect(setBackgroundMessageHandler).toHaveBeenCalledTimes(1);
  });

  it('skips web and Expo Go where the native Firebase module is unavailable', () => {
    const setBackgroundMessageHandler = jest.fn();

    expect(registerFcmBackgroundHandler('web', false, { setBackgroundMessageHandler })).toBe(false);
    expect(registerFcmBackgroundHandler('android', true, { setBackgroundMessageHandler })).toBe(false);
    expect(setBackgroundMessageHandler).not.toHaveBeenCalled();
  });
});
