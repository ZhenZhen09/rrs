import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TaskDetailIcon } from '../TaskDetailIcon';
import { scale } from '@/utils/responsive';

describe('TaskDetailIcon', () => {
  it('renders the shared circular icon treatment with the supplied semantic colors', () => {
    const { UNSAFE_getByProps } = render(
      <TaskDetailIcon name="person" iconColor="#7C3AED" backgroundColor="#EDE9FE" />,
    );

    const orbStyle = StyleSheet.flatten(UNSAFE_getByProps({ testID: 'task-detail-icon' }).props.style);
    const innerStyle = StyleSheet.flatten(UNSAFE_getByProps({ testID: 'task-detail-icon-inner' }).props.style);

    expect(orbStyle).toMatchObject({
      width: scale(30),
      height: scale(30),
      borderRadius: scale(15),
      backgroundColor: '#EDE9FE',
    });
    expect(innerStyle).toMatchObject({
      width: scale(23),
      height: scale(23),
      borderRadius: scale(11.5),
      backgroundColor: '#FFFFFF',
    });
  });
});
