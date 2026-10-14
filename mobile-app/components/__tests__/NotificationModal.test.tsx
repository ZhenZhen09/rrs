import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NotificationModal } from '../NotificationModal';

jest.mock('@expo/vector-icons', () => ({ MaterialIcons: () => null }));

describe('NotificationModal', () => {
  it('formats long overdue messages for the rider while preserving shorter messages', () => {
    render(
      <NotificationModal
        visible
        onClose={jest.fn()}
        notifications={[
          { id: 'long-overdue', type: 'delivery_overdue', message: 'Delivery #203889 is overdue by 121 minutes.' },
          { id: 'short-overdue', type: 'delivery_overdue', message: 'Delivery #203890 is overdue by 3 minutes.' },
        ]}
        onNotificationClick={jest.fn()}
        onMarkAllRead={jest.fn()}
      />,
    );

    expect(screen.getByText('Delivery #203889 is overdue by 2 hr 1 min.')).toBeTruthy();
    expect(screen.getByText('Delivery #203890 is overdue by 3 minutes.')).toBeTruthy();
  });
});
