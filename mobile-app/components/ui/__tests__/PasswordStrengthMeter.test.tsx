import React from 'react';
import { render } from '@testing-library/react-native';
import PasswordStrengthMeter from '../PasswordStrengthMeter';
import { Colors } from '@/constants/Colors';
import { StyleSheet } from 'react-native';

describe('PasswordStrengthMeter', () => {
  it('renders correctly with different scores', () => {
    const { getByTestId, rerender } = render(<PasswordStrengthMeter score={0} />);
    const bar = getByTestId('strength-bar');
    
    // Flatten styles for easier assertion
    const getFlattenedStyle = (el: { props: { style: object } }) => StyleSheet.flatten(el.props.style);

    // Score 0: Width 0.00%, Color Border
    expect(getFlattenedStyle(bar)).toMatchObject({ 
      width: '0.00%', 
      backgroundColor: Colors.light.border 
    });
    
    rerender(<PasswordStrengthMeter score={1} />);
    // Score 1: Width 33.33%, Color Danger
    expect(getFlattenedStyle(bar)).toMatchObject({ 
      width: '33.33%', 
      backgroundColor: Colors.light.danger 
    });

    rerender(<PasswordStrengthMeter score={2} />);
    // Score 2: Width 66.67%, Color Warning
    expect(getFlattenedStyle(bar)).toMatchObject({ 
      width: '66.67%', 
      backgroundColor: Colors.light.warning 
    });

    rerender(<PasswordStrengthMeter score={3} />);
    // Score 3: Width 100.00%, Color Success
    expect(getFlattenedStyle(bar)).toMatchObject({ 
      width: '100.00%', 
      backgroundColor: Colors.light.success 
    });
  });
});
