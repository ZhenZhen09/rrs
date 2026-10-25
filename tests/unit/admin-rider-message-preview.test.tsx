// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloatingRiderMessagePreview } from '../../src/app/components/Admin/FloatingRiderMessagePreview';

function socketFixture() {
  const callbacks = new Map<string, Set<(...args: unknown[]) => void>>();
  const socket = {
    on(event: string, callback: (...args: unknown[]) => void) {
      const listeners = callbacks.get(event) || new Set();
      listeners.add(callback);
      callbacks.set(event, listeners);
      return socket;
    },
    off(event: string, callback: (...args: unknown[]) => void) {
      callbacks.get(event)?.delete(callback);
      return socket;
    },
  };
  return {
    socket: socket as unknown as Pick<Socket, 'on' | 'off'>,
    emit: (event: string, payload?: unknown) => callbacks.get(event)?.forEach(callback => callback(payload)),
  };
}

const riderMessage = (id: string, body: string) => ({
  id,
  conversationId: 'conversation-1',
  clientMessageId: `client-${id}`,
  body,
  sender: { id: 'rider-1', name: 'Riley Rider', role: 'rider' as const, avatarId: 'avatar_02' },
  createdAt: '2026-10-10T10:00:00.000Z',
  readAt: null,
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('floating rider message preview', () => {
  it('updates one preview with the latest rider message and dismisses without opening the conversation', async () => {
    const fixture = socketFixture();
    const onOpenConversation = vi.fn();
    render(<FloatingRiderMessagePreview socket={fixture.socket} actorId="admin-1" inboxActive={false} onOpenConversation={onOpenConversation} />);

    act(() => {
      fixture.emit('conversation-message', { conversationId: 'conversation-1', message: riderMessage('message-1', 'I am waiting at pickup') });
      fixture.emit('conversation-message', { conversationId: 'conversation-1', message: riderMessage('message-2', 'I have arrived') });
    });

    expect(screen.getByRole('status').textContent).toContain('I have arrived');
    expect(screen.queryByText('I am waiting at pickup')).toBeNull();
    expect(screen.getByText('I have arrived')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Hide latest message from Riley Rider/ }).classList.contains('rounded-full')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss message from Riley Rider' }));

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(onOpenConversation).not.toHaveBeenCalled();
  });

  it('opens the message conversation when the preview is clicked', () => {
    const fixture = socketFixture();
    const onOpenConversation = vi.fn();
    render(<FloatingRiderMessagePreview socket={fixture.socket} actorId="admin-1" inboxActive={false} onOpenConversation={onOpenConversation} />);
    act(() => fixture.emit('conversation-message', { conversationId: 'conversation-1', message: riderMessage('message-1', 'Need directions') }));

    fireEvent.click(screen.getByRole('button', { name: /Open conversation with Riley Rider/ }));

    expect(onOpenConversation).toHaveBeenCalledWith('conversation-1');
  });

  it('does not show a floating preview while the Inbox is open', () => {
    const fixture = socketFixture();
    render(<FloatingRiderMessagePreview socket={fixture.socket} actorId="admin-1" inboxActive onOpenConversation={vi.fn()} />);

    act(() => fixture.emit('conversation-message', { conversationId: 'conversation-1', message: riderMessage('message-1', 'Already in Inbox') }));

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByTestId('floating-rider-message-preview')).toBeNull();
  });

  it('shows the bubble when a message arrives, then slides it closed after 8 seconds while keeping the dot visible', () => {
    vi.useFakeTimers();
    const fixture = socketFixture();
    render(<FloatingRiderMessagePreview socket={fixture.socket} actorId="admin-1" inboxActive={false} onOpenConversation={vi.fn()} />);

    act(() => fixture.emit('conversation-message', { conversationId: 'conversation-1', message: riderMessage('message-1', 'Please call me') }));

    expect(screen.getByText('Please call me')).toBeTruthy();
    expect(screen.getByTestId('rider-message-unread-dot')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Hide latest message from Riley Rider/ }).getAttribute('aria-expanded')).toBe('true');

    act(() => vi.advanceTimersByTime(8_000));

    expect(screen.getByTestId('rider-message-unread-dot')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Show latest message from Riley Rider/ }).getAttribute('aria-expanded')).toBe('false');
  });
});
