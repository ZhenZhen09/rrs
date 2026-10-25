// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NotificationBell } from '../../src/app/components/Admin/NotificationBell';

vi.mock('../../src/app/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1' } }),
}));

vi.mock('../../src/app/context/DataContext', () => ({
  useData: () => ({ notifications: [], requests: [], markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn() }),
}));

vi.mock('../../src/app/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) => <div data-open={open}>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => children,
  SheetContent: ({ children, className }: { children: React.ReactNode; className: string }) => <div role="dialog" className={className}>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

afterEach(cleanup);

describe('admin notification bell', () => {
  it('renders the notification panel anchored to the desktop viewport', () => {
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog').className).toContain('md:top-0');
    expect(screen.getByRole('dialog').className).toContain('md:bottom-0');
  });
});
