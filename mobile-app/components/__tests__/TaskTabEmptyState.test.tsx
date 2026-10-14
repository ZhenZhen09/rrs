import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { scale } from '@/utils/responsive';
import { TaskTabEmptyState } from '../TaskTabEmptyState';

describe('TaskTabEmptyState', () => {
  it('centers the icon and message and gives each tab its own icon style', () => {
    const overdue = render(
      <TaskTabEmptyState variant="overdue" icon={<Text>done</Text>} title="All caught up!" message="You have no overdue tasks." />
    );
    expect(overdue.getByTestId('task-tab-empty-state')).toHaveStyle({ alignItems: 'center', justifyContent: 'center' });
    const overdueIcon = overdue.getByTestId('task-tab-empty-icon', { includeHiddenElements: true });
    expect(overdueIcon).toHaveStyle({ width: scale(76), height: scale(76), borderRadius: scale(38), backgroundColor: '#DDF8ED' });
    expect(overdue.getByText('All caught up!')).toBeTruthy();
    expect(overdue.getByText('You have no overdue tasks.')).toBeTruthy();

    const upcoming = render(
      <TaskTabEmptyState variant="upcoming" icon={<Text>calendar</Text>} title="No upcoming jobs scheduled" message="Pull down to check for schedule updates." />
    );
    const upcomingIcon = upcoming.getByTestId('task-tab-empty-icon', { includeHiddenElements: true });
    expect(upcomingIcon).toHaveStyle({ width: scale(76), height: scale(76), borderRadius: scale(22), backgroundColor: '#EAF2FF' });
    expect(upcoming.getByText('No upcoming jobs scheduled')).toBeTruthy();
  });
});
