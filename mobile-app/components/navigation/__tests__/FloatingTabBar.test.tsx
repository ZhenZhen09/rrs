import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { FloatingTabBar } from '../FloatingTabBar';

jest.mock('expo-linear-gradient', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    LinearGradient: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      ReactModule.createElement(View, props, children),
  };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('@/hooks/useReducedMotionPreference', () => ({ useReducedMotionPreference: () => true }));

const routeNames = ['overdue', 'tomorrow', 'index', 'inbox', 'history'];
const routeLabels = ['Overdue', 'Upcoming', 'Today', 'Inbox', 'History'];

const createProps = (focusedIndex = 2, bottomInset = 0): BottomTabBarProps => {
  const routes = routeNames.map(name => ({ key: `${name}-key`, name, params: undefined }));
  const descriptors = Object.fromEntries(routes.map((route, index) => [route.key, {
    navigation: {},
    route,
    options: {
      title: routeLabels[index],
      tabBarIcon: () => <React.Fragment />,
    },
    render: () => <React.Fragment />,
  }]));

  return {
    state: {
      key: 'tabs',
      index: focusedIndex,
      routeNames,
      routes,
      type: 'tab',
      stale: false,
      history: [],
    },
    descriptors,
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    },
    insets: { top: 0, right: 0, bottom: bottomInset, left: 0 },
  } as unknown as BottomTabBarProps;
};

describe('FloatingTabBar', () => {
  it('renders the five destinations with Today in the center', () => {
    const { getAllByRole } = render(
      <FloatingTabBar {...createProps()} badgeCounts={{ overdue: 2, tomorrow: 4, index: 1, inbox: 3, history: 0 }} />
    );

    expect(getAllByRole('tab').map(tab => tab.props.accessibilityLabel)).toEqual([
      'Overdue, 2 tasks',
      'Upcoming, 4 tasks',
      'Today, 1 task',
      'Inbox, 3 unread conversations',
      'History',
    ]);
  });

  it('anchors the prominent Today button to the exact center of the bar', () => {
    const { getByTestId } = render(
      <FloatingTabBar {...createProps()} badgeCounts={{ overdue: 0, tomorrow: 0, index: 0, inbox: 0, history: 0 }} />
    );

    expect(getByTestId('tab-button-index')).toHaveStyle({ position: 'absolute', left: '50%' });
  });

  it('keeps the Today circle prominent without overpowering the neighboring icons', () => {
    const { getByTestId } = render(
      <FloatingTabBar {...createProps()} badgeCounts={{ overdue: 0, tomorrow: 0, index: 0, inbox: 0, history: 0 }} />
    );

    expect(getByTestId('today-center-circle')).toHaveStyle({ width: 60, height: 60 });
    expect(getByTestId('today-center-glow')).toHaveStyle({ width: 66, height: 66 });
  });

  it('uses different badge colors for overdue work, unread messages, and routine task counts', () => {
    const { getByTestId } = render(
      <FloatingTabBar {...createProps()} badgeCounts={{ overdue: 2, tomorrow: 4, index: 1, inbox: 3, history: 0 }} />
    );

    expect(getByTestId('tab-badge-overdue')).toHaveStyle({ backgroundColor: '#EF4444' });
    expect(getByTestId('tab-badge-inbox')).toHaveStyle({ backgroundColor: '#4F46E5' });
    expect(getByTestId('tab-badge-tomorrow')).toHaveStyle({ backgroundColor: '#E2E8F0' });
    expect(getByTestId('tab-badge-index')).toHaveStyle({ backgroundColor: '#E2E8F0' });
  });

  it('mutes the raised Today control when another tab is selected', () => {
    const { getByTestId } = render(
      <FloatingTabBar {...createProps(0)} badgeCounts={{ overdue: 0, tomorrow: 0, index: 0, inbox: 0, history: 0 }} />
    );

    expect(getByTestId('tab-button-index').props.accessibilityState).toEqual({ selected: false });
    expect(getByTestId('today-gradient').props.colors).toEqual(['#EDE9FE', '#F5F3FF', '#F5F3FF']);
    expect(getByTestId('today-center-circle')).toHaveStyle({ elevation: 0, shadowOpacity: 0 });
  });

  it('keeps the Today treatment emphasized when it is selected', () => {
    const { getByTestId } = render(
      <FloatingTabBar {...createProps(2)} badgeCounts={{ overdue: 0, tomorrow: 0, index: 0, inbox: 0, history: 0 }} />
    );

    expect(getByTestId('tab-button-index').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('today-gradient').props.colors).toEqual(['#6366F1', '#7C3AED', '#8B5CF6']);
  });

  it('leaves the shared hills-and-road backdrop visible behind the bar on every tab', () => {
    for (const focusedIndex of [0, 1, 2, 3, 4]) {
      const { getByTestId, unmount } = render(
        <FloatingTabBar {...createProps(focusedIndex)} badgeCounts={{ overdue: 0, tomorrow: 0, index: 0, inbox: 0, history: 0 }} />
      );

      expect(getByTestId('floating-tabbar-background')).toHaveStyle({ backgroundColor: 'transparent' });
      unmount();
    }
  });

  it('keeps the Today backdrop outside the floating navigation layer', () => {
    const today = render(
      <FloatingTabBar {...createProps(2, 34)} badgeCounts={{ overdue: 0, tomorrow: 0, index: 0, inbox: 0, history: 0 }} />
    );
    expect(today.queryByTestId('tabbar-road-art')).toBeNull();

    today.unmount();
    const upcoming = render(
      <FloatingTabBar {...createProps(1)} badgeCounts={{ overdue: 0, tomorrow: 0, index: 0, inbox: 0, history: 0 }} />
    );
    expect(upcoming.queryByTestId('tabbar-road-art')).toBeNull();
  });

  it('caps large badge counts at 9+', () => {
    const { getByText } = render(
      <FloatingTabBar {...createProps()} badgeCounts={{ overdue: 12, tomorrow: 0, index: 0, inbox: 0, history: 0 }} />
    );

    expect(getByText('9+')).toBeTruthy();
  });

  it('emits tabPress and navigates to an unfocused destination', () => {
    const props = createProps(0);
    const { getByTestId } = render(
      <FloatingTabBar {...props} badgeCounts={{ overdue: 0, tomorrow: 0, index: 0, inbox: 0, history: 0 }} />
    );

    fireEvent.press(getByTestId('tab-button-tomorrow'));

    expect(props.navigation.emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'tomorrow-key',
      canPreventDefault: true,
    });
    expect(props.navigation.navigate).toHaveBeenCalledWith('tomorrow', undefined);
  });
});
