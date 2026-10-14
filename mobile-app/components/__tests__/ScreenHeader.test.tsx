import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { moderateScale } from '@/utils/responsive';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

describe('ScreenHeader hero variant', () => {
  it('opens Settings from the accessible profile menu', () => {
    const onSettingsPress = jest.fn();
    render(<ScreenHeader variant="hero" title="Inbox" onNotifPress={jest.fn()} onLogoutPress={jest.fn()} onSettingsPress={onSettingsPress} />);
    fireEvent.press(screen.getByLabelText('Profile options'));
    const action = screen.getByRole('button', { name: 'Settings' });
    expect(action).toHaveStyle({ minHeight: 48 });
    fireEvent.press(action);
    expect(onSettingsPress).toHaveBeenCalledTimes(1);
  });
  it('renders a compact status control beside the title', () => {
    render(
      <ScreenHeader
        variant="hero"
        title="Today's Tasks"
        subtitle="Wednesday, October 7"
        titleAccessory={<Text testID="today-status-control">● ONLINE</Text>}
        onNotifPress={jest.fn()}
        onLogoutPress={jest.fn()}
      />,
    );

    expect(within(screen.getByTestId('hero-title-row')).getByTestId('today-status-control')).toBeTruthy();
    expect(screen.getByText('Wednesday, October 7')).toBeTruthy();
  });

  it('matches the compact tab header height while keeping reduced action buttons accessible', () => {
    render(
      <ScreenHeader
        variant="hero"
        title="Today's Tasks"
        subtitle="Wednesday, October 7"
        badgeLabel="LIVE"
        onNotifPress={jest.fn()}
        onLogoutPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId('hero-header')).toHaveStyle({ minHeight: 92 });
    expect(screen.getByTestId('header_notifications_button')).toHaveStyle({ width: 44, height: 44 });
    expect(screen.getByTestId('header_notifications_surface')).toHaveStyle({
      width: moderateScale(32),
      height: moderateScale(32),
    });
  });

  it('keeps notification and logout actions accessible and connected', () => {
    const onNotifPress = jest.fn();
    const onLogoutPress = jest.fn();

    render(
      <ScreenHeader
        variant="hero"
        title="Today's Tasks"
        subtitle="Wednesday, October 7"
        titleAccessory={<Text>● ONLINE</Text>}
        onNotifPress={onNotifPress}
        onLogoutPress={onLogoutPress}
        onSettingsPress={jest.fn()}
        unreadCount={4}
      />,
    );

    fireEvent.press(screen.getByLabelText('Notifications, 4 unread'));
    fireEvent.press(screen.getByLabelText('Profile options'));
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Log out'));

    expect(onNotifPress).toHaveBeenCalledTimes(1);
    expect(onLogoutPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Today's Tasks")).toBeTruthy();
    expect(screen.getByText('● ONLINE')).toBeTruthy();
  });

  it('opens the settings action from the profile menu', () => {
    const onSettingsPress = jest.fn();
    render(<ScreenHeader variant="hero" title="Inbox" onNotifPress={jest.fn()} onLogoutPress={jest.fn()} onSettingsPress={onSettingsPress} />);

    fireEvent.press(screen.getByLabelText('Profile options'));
    fireEvent.press(screen.getByRole('button', { name: 'Settings' }));

    expect(onSettingsPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Log out')).toBeNull();
  });
});
