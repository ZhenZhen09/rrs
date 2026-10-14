import React from 'react';
import { render } from '@testing-library/react-native';
import { RiderSurfaceGradient } from '../RiderSurfaceGradient';

jest.mock('expo-linear-gradient', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    LinearGradient: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      ReactModule.createElement(View, props, children),
  };
});

describe('RiderSurfaceGradient', () => {
  it('uses the same translucent mist-gray tint across rider tabs without intercepting touches', () => {
    const { getByTestId } = render(<RiderSurfaceGradient />);
    const gradient = getByTestId('rider-surface-gradient');

    expect(gradient.props.colors).toEqual([
      'rgba(255, 255, 255, 0)',
      'rgba(241, 245, 250, 0.55)',
    ]);
    expect(gradient.props.pointerEvents).toBe('none');
  });
});
