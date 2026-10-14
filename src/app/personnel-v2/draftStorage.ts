export const LEGACY_PERSONNEL_V2_DRAFT_KEY = 'personnel-v2-draft';

const PERSONNEL_V2_DRAFT_KEY_PREFIX = `${LEGACY_PERSONNEL_V2_DRAFT_KEY}:`;

type StorageRemover = Pick<Storage, 'removeItem'>;

export function getPersonnelV2DraftKey(userId?: string | null): string | null {
  if (!userId?.trim()) return null;
  return `${PERSONNEL_V2_DRAFT_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

export function clearLegacyPersonnelV2Draft(storage: StorageRemover): void {
  try {
    storage.removeItem(LEGACY_PERSONNEL_V2_DRAFT_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function clearPersonnelV2Draft(userId: string | null | undefined, storage: StorageRemover): void {
  const key = getPersonnelV2DraftKey(userId);
  if (key) {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }
  clearLegacyPersonnelV2Draft(storage);
}
