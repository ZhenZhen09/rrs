import type { DeliveryRequest } from '../types';
import { isActiveRequest } from './statusMapping';

const STARTED_ROUTE_STATUSES = new Set([
  'in_progress',
  'arrived',
  'picked_up',
  'arrived_at_pickup',
  'arrived_at_dropoff',
]);

export const isRouteReorderableTask = (request: DeliveryRequest) =>
  isActiveRequest(request) &&
  Boolean(request.assigned_rider_id) &&
  !STARTED_ROUTE_STATUSES.has(request.delivery_status || '');

export const getActiveRouteSelection = (
  requests: DeliveryRequest[],
  selectedIds: string[],
): { riderId: string; requests: DeliveryRequest[] } | null => {
  if (selectedIds.length === 0) return null;

  const selectedIdSet = new Set(selectedIds);
  const selectedTasks = requests.filter(
    (request) => selectedIdSet.has(request.request_id) && isRouteReorderableTask(request),
  );
  if (selectedTasks.length !== selectedIds.length) return null;

  const riderIds = new Set(selectedTasks.map((request) => request.assigned_rider_id));
  if (riderIds.size !== 1) return null;

  const riderId = selectedTasks[0].assigned_rider_id;
  if (!riderId) return null;

  return {
    riderId,
    requests: requests.filter(
      (request) => request.assigned_rider_id === riderId && isActiveRequest(request),
    ),
  };
};

export const toggleActiveRouteSelection = (
  requests: DeliveryRequest[],
  selectedIds: string[],
  requestId: string,
): { selectedIds: string[]; blocked: boolean } => {
  if (selectedIds.includes(requestId)) {
    return { selectedIds: selectedIds.filter((id) => id !== requestId), blocked: false };
  }

  const task = requests.find((request) => request.request_id === requestId);
  if (!task || !isRouteReorderableTask(task)) {
    return { selectedIds, blocked: false };
  }

  const selection = getActiveRouteSelection(requests, selectedIds);
  if (selectedIds.length > 0 && (!selection || selection.riderId !== task.assigned_rider_id)) {
    return { selectedIds, blocked: true };
  }

  return { selectedIds: [...selectedIds, requestId], blocked: false };
};
