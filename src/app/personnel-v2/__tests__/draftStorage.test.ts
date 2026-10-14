import { describe, expect, it } from 'vitest';
import {
  clearPersonnelV2Draft,
  getPersonnelV2DraftKey,
  LEGACY_PERSONNEL_V2_DRAFT_KEY,
} from '../draftStorage';

describe('personnel v2 draft storage', () => {
  it('assigns separate browser storage keys to separate personnel accounts', () => {
    expect(getPersonnelV2DraftKey('personnel-a')).toBe('personnel-v2-draft:personnel-a');
    expect(getPersonnelV2DraftKey('personnel-b')).toBe('personnel-v2-draft:personnel-b');
    expect(getPersonnelV2DraftKey(undefined)).toBeNull();
  });

  it('clears the signing-out account draft and the old unowned shared draft only', () => {
    const values = new Map<string, string>([
      ['personnel-v2-draft:personnel-a', 'A draft'],
      ['personnel-v2-draft:personnel-b', 'B draft'],
      [LEGACY_PERSONNEL_V2_DRAFT_KEY, 'Unowned legacy draft'],
    ]);
    const storage = { removeItem: (key: string) => { values.delete(key); } };

    clearPersonnelV2Draft('personnel-a', storage);

    expect(values.has('personnel-v2-draft:personnel-a')).toBe(false);
    expect(values.has(LEGACY_PERSONNEL_V2_DRAFT_KEY)).toBe(false);
    expect(values.get('personnel-v2-draft:personnel-b')).toBe('B draft');
  });
});
