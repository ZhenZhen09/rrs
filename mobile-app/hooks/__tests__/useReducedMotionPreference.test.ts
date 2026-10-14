import { AccessibilityInfo } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useReducedMotionPreference } from '../useReducedMotionPreference';

it('uses and updates the system reduced-motion preference and removes its subscription', async () => {
  let change!: (value: boolean) => void;
  const remove = jest.fn();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_event, callback) => {
    change = callback as (value: boolean) => void;
    return { remove };
  });
  const { result, unmount } = renderHook(() => useReducedMotionPreference());
  await act(async () => {});
  expect(result.current).toBe(true);
  act(() => change(false));
  expect(result.current).toBe(false);
  unmount();
  expect(remove).toHaveBeenCalledTimes(1);
  jest.restoreAllMocks();
});
