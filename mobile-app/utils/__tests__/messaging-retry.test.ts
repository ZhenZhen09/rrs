import { createClientMessageId, reconcileMessage } from '@/utils/messagingRetry';

describe('messaging retry reconciliation', () => {
  it('keeps the same client id when a message is retried', () => {
    const pending = { body: 'Please confirm the delivery', clientMessageId: createClientMessageId(), status: 'pending' as const };

    expect(reconcileMessage(pending, { id: 'server-1', clientMessageId: pending.clientMessageId })).toEqual({
      ...pending,
      id: 'server-1',
      status: 'sent',
    });
  });

  it('creates a server-compatible UUID when randomUUID is unavailable', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });

    try {
      expect(createClientMessageId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
    }
  });

  it('does not add a duplicate when the server returns the retried message', () => {
    const existing = [{ id: 'local-1', clientMessageId: 'client-1', body: 'Hello', status: 'pending' as const }];

    expect(reconcileMessage(existing[0], { id: 'server-1', clientMessageId: 'client-1' })).toEqual({
      id: 'server-1', clientMessageId: 'client-1', body: 'Hello', status: 'sent',
    });
  });
});
