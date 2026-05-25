import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PasswordResetOverlay from '../PasswordResetOverlay';

// Mock PasswordStrengthMeter since it has its own tests
jest.mock('../PasswordStrengthMeter', () => {
  const { View } = require('react-native');
  return (props: any) => <View testID="mock-strength-meter" {...props} />;
});

describe('PasswordResetOverlay', () => {
  const defaultProps = {
    visible: true,
    userId: 'test-user-123',
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  it('renders correctly when visible', () => {
    const { getByText, getByPlaceholderText } = render(<PasswordResetOverlay {...defaultProps} />);
    
    expect(getByText('Secure Your Account')).toBeTruthy();
    expect(getByPlaceholderText('New Password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm Password')).toBeTruthy();
  });

  it('validates password requirements correctly', () => {
    const { getByPlaceholderText, getByRole } = render(<PasswordResetOverlay {...defaultProps} />);
    const passwordInput = getByPlaceholderText('New Password');
    const confirmInput = getByPlaceholderText('Confirm Password');
    const submitButton = getByRole('button');

    // Initial state: button disabled
    expect(submitButton.props.accessibilityState.disabled).toBe(true);

    // Enter valid password
    fireEvent.changeText(passwordInput, 'Password123!');
    fireEvent.changeText(confirmInput, 'Password123!');

    // Button should be enabled
    expect(submitButton.props.accessibilityState.disabled).toBe(false);
  });
});
