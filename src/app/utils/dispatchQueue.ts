import type { DeliveryRequest } from '../types';

const compareText = (left: unknown, right: unknown) => String(left ?? '').localeCompare(String(right ?? ''));

export function compareRiderQueue(left: DeliveryRequest, right: DeliveryRequest): number {
  const riderCompare = compareText(left.assigned_rider_id || 'unassigned', right.assigned_rider_id || 'unassigned');
  if (riderCompare) return riderCompare;

  const leftRank = Number(left.queue_order);
  const rightRank = Number(right.queue_order);
  const normalizedLeft = Number.isFinite(leftRank) && leftRank > 0 ? leftRank : Number.MAX_SAFE_INTEGER;
  const normalizedRight = Number.isFinite(rightRank) && rightRank > 0 ? rightRank : Number.MAX_SAFE_INTEGER;
  if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;

  const dateCompare = compareText(left.delivery_date, right.delivery_date);
  if (dateCompare) return dateCompare;
  const createdCompare = compareText(left.created_at, right.created_at);
  if (createdCompare) return createdCompare;
  return compareText(left.request_id, right.request_id);
}
