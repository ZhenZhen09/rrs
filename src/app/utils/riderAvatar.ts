import { getDefaultRiderAvatarId as getAvatarId } from '../../../shared/riderAvatars';
import { getRiderAvatarUrl } from './riderAvatarCatalog.generated';

export const getDefaultRiderAvatarId = getAvatarId;

export function getDefaultRiderAvatarUrl(identity: string): string {
  return getRiderAvatarUrl(identity) || getRiderAvatarUrl(getAvatarId(identity)) || '/rider-avatars/avatar_01.png';
}
