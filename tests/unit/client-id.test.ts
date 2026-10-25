import { describe, expect, it, vi } from 'vitest';
import { createClientMessageId } from '../../src/app/utils/clientId';

describe('createClientMessageId', () => {
  it('uses randomUUID when the browser supports it', () => {
    const randomUUID = vi.fn(() => 'native-id');
    const getRandomValues = vi.fn((bytes: Uint8Array) => bytes);

    expect(createClientMessageId({ randomUUID, getRandomValues } as unknown as Crypto)).toBe('native-id');
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it('creates a v4 UUID with getRandomValues when randomUUID is unavailable', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.fill(0);
      return bytes;
    });

    expect(createClientMessageId({ getRandomValues } as unknown as Crypto)).toBe('00000000-0000-4000-8000-000000000000');
    expect(getRandomValues).toHaveBeenCalledOnce();
  });
});
