import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { RiderAvatar } from '@/components/profile/RiderAvatar';

describe('RiderAvatar', () => {
  it('renders a bundled image for a known ID and initials for an unknown ID', () => {
    const { rerender } = render(<RiderAvatar avatarId="avatar_03" name="Alex Rider" size={64} />);
    expect(screen.getByTestId('rider-avatar-image').props.source).toBeDefined();
    rerender(<RiderAvatar avatarId="missing" name="Alex Rider" size={64} />);
    expect(screen.queryByTestId('rider-avatar-image')).toBeNull();
    expect(screen.getByText('AR')).toBeTruthy();
  });
});

describe('AvatarPicker', () => {
  it('offers eight accessible choices and marks the saved choice visibly', () => {
    render(<AvatarPicker selectedAvatarId="avatar_03" disabled={false} onSelect={jest.fn()} />);
    expect(screen.getAllByRole('radio')).toHaveLength(8);
    expect(screen.getByRole('radio', { name: 'Avatar 3, selected' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('avatar-03-check')).toBeTruthy();
  });

  it('only sends an enabled choice to the selection handler', () => {
    const onSelect = jest.fn();
    const { rerender } = render(<AvatarPicker selectedAvatarId="avatar_01" disabled={false} onSelect={onSelect} />);
    fireEvent.press(screen.getByRole('radio', { name: 'Avatar 2' }));
    expect(onSelect).toHaveBeenCalledWith('avatar_02');
    rerender(<AvatarPicker selectedAvatarId="avatar_01" disabled onSelect={onSelect} />);
    fireEvent.press(screen.getByRole('radio', { name: 'Avatar 2' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
