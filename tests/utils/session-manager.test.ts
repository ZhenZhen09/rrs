import { test, expect } from '@playwright/test';
import { saveSession, loadSession, SESSION_FILE } from './session-manager';
import fs from 'fs';

test.describe('session-manager', () => {
  const testData = { requestId: 'test-123', riderToken: 'token-abc' };

  test.afterEach(() => {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
  });

  test('should save and load session data', () => {
    saveSession(testData);
    const loaded = loadSession();
    expect(loaded).toEqual(testData);
  });

  test('should return null if session file does not exist', () => {
    const loaded = loadSession();
    expect(loaded).toBeNull();
  });
});
