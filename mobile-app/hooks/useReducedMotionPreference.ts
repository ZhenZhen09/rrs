import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotionPreference(): boolean {
  // Show the readable final state until the system preference is known.
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    const update = (value: boolean) => { if (active) setReduceMotion(value); };
    void AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduceMotion;
}
