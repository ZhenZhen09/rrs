import { shouldStartBackgroundLocation } from '../locationCapability';

describe('Background location capability', () => {
  it('starts only when the native task API is available and permission is granted', () => {
    expect(shouldStartBackgroundLocation({
      taskManagerAvailable: true,
      permissionGranted: true,
      taskRegistered: false,
    })).toBe(true);
  });

  it('does not start when the native task API is unavailable, such as Expo Go', () => {
    expect(shouldStartBackgroundLocation({
      taskManagerAvailable: false,
      permissionGranted: true,
      taskRegistered: false,
    })).toBe(false);
  });

  it('does not start when the task is already registered', () => {
    expect(shouldStartBackgroundLocation({
      taskManagerAvailable: true,
      permissionGranted: true,
      taskRegistered: true,
    })).toBe(false);
  });
});
