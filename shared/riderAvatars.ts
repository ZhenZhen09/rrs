import catalog from './riderAvatarCatalog.json';

const avatarIds = catalog.map((entry) => entry.id);

/** Assigns an existing static avatar consistently without storing it in users. */
export function getDefaultRiderAvatarId(identity: string): string {
  const key = identity.trim() || 'rider';
  const hash = Array.from(key).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return avatarIds[hash % avatarIds.length];
}
