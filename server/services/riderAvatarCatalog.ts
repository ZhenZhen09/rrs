import { RIDER_AVATAR_IDS } from './riderAvatarCatalog.generated';
export { isRiderAvatarId, RIDER_AVATAR_IDS } from './riderAvatarCatalog.generated';
export type { RiderAvatarId } from './riderAvatarCatalog.generated';

export function getDefaultRiderAvatarId(identity: string): string {
  const key = identity.trim() || 'rider';
  const hash = Array.from(key).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return RIDER_AVATAR_IDS[hash % RIDER_AVATAR_IDS.length];
}
