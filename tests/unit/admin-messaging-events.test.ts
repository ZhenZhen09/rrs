import { describe, expect, it, vi } from 'vitest';
import type { Socket } from 'socket.io-client';
import { subscribeAdminMessaging, subscribeAdminRiderMessagePreview } from '../../src/app/utils/messaging';

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
    count: () => [...callbacks.values()].reduce((count, listeners) => count + listeners.size, 0),
  };
}

describe('admin messaging event registration', () => {
  it('previews each unique rider message once and ignores admin messages', () => {
    const fixture = socketFixture();
    const onPreview = vi.fn();
    const cleanup = subscribeAdminRiderMessagePreview(fixture.socket, 'admin-1', onPreview);
    const riderMessage = {
      id: 'message-1', conversationId: 'conversation-1', clientMessageId: 'client-1', body: 'I have arrived',
      sender: { id: 'rider-1', name: 'Rider One', role: 'rider' as const, avatarId: 'avatar_02' },
      createdAt: '2026-10-10T10:00:00.000Z', readAt: null,
    };

    fixture.emit('conversation-message', { conversationId: riderMessage.conversationId, message: riderMessage });
    fixture.emit('conversation-message', { conversationId: riderMessage.conversationId, message: riderMessage });
    fixture.emit('conversation-message', {
      conversationId: riderMessage.conversationId,
      message: { ...riderMessage, id: 'admin-message', sender: { id: 'admin-1', name: 'Admin', role: 'admin' as const, avatarId: null } },
    });

    expect(onPreview).toHaveBeenCalledExactlyOnceWith(riderMessage);
    cleanup();
  });

  it('routes receipts and legacy read-shaped updates only to the receipt handler', () => {
    const fixture = socketFixture();
    const handlers = { onMessage: vi.fn(), onRead: vi.fn(), onMetadata: vi.fn(), onConnect: vi.fn() };
    const cleanup = subscribeAdminMessaging(fixture.socket, handlers);
    const receipt = { conversationId: 'conversation-1', userId: 'admin-me', readAt: '2026-10-03 10:00:00' };
    fixture.emit('conversation-read', receipt);
    fixture.emit('conversation-updated', receipt);
    expect(handlers.onRead.mock.calls).toEqual([[receipt], [receipt]]);
    expect(handlers.onMetadata).not.toHaveBeenCalled();
    expect(handlers.onMessage).not.toHaveBeenCalled();
    cleanup();
    expect(fixture.count()).toBe(0);
  });

  it('routes ordinary metadata and reconnect without accumulating listeners', () => {
    const fixture = socketFixture();
    const handlers = { onMessage: vi.fn(), onRead: vi.fn(), onMetadata: vi.fn(), onConnect: vi.fn() };
    const message = {
      id: 'message-1', conversationId: 'conversation-1', clientMessageId: 'client-1', body: 'On my way',
      sender: { id: 'rider-1', name: 'Rider One', role: 'rider' }, createdAt: '2026-10-03 10:00:00', readAt: null,
    };
    const payload = { conversationId: 'conversation-1', lastMessage: message };
    const delivery = { conversationId: 'conversation-1', message };
    const cleanup = subscribeAdminMessaging(fixture.socket, handlers);
    fixture.emit('conversation-updated', payload);
    fixture.emit('conversation-message', delivery);
    fixture.emit('connect');
    fixture.emit('connect');
    expect(handlers.onMetadata).toHaveBeenCalledExactlyOnceWith(payload);
    expect(handlers.onMessage).toHaveBeenCalledExactlyOnceWith(delivery);
    expect(handlers.onConnect).toHaveBeenCalledTimes(2);
    cleanup();
    fixture.emit('connect');
    fixture.emit('conversation-message', delivery);
    expect(handlers.onConnect).toHaveBeenCalledTimes(2);
    expect(handlers.onMessage).toHaveBeenCalledTimes(1);
    const nextCleanup = subscribeAdminMessaging(fixture.socket, handlers);
    fixture.emit('connect');
    expect(handlers.onConnect).toHaveBeenCalledTimes(3);
    expect(fixture.count()).toBe(4);
    nextCleanup();
  });

  it('removes only its own callback references', () => {
    const fixture = socketFixture();
    const unrelated = vi.fn();
    fixture.socket.on('connect', unrelated);
    const handlers = { onMessage: vi.fn(), onRead: vi.fn(), onMetadata: vi.fn(), onConnect: vi.fn() };
    const cleanup = subscribeAdminMessaging(fixture.socket, handlers);
    cleanup();
    cleanup();
    fixture.emit('connect');
    expect(unrelated).toHaveBeenCalledTimes(1);
    expect(handlers.onConnect).not.toHaveBeenCalled();
    expect(fixture.count()).toBe(1);
  });
});
