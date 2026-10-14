export interface RiderQueueTask {
  request_id: string;
  delivery_status: string | null;
  queue_order: number | null;
}

export class RiderQueueValidationError extends Error {
  readonly code = 'QUEUE_CHANGED';

  constructor(message: string) {
    super(message);
    this.name = 'RiderQueueValidationError';
  }
}

const STARTED_STATUSES = new Set([
  'in_progress',
  'arrived',
  'picked_up',
  'arrived_at_pickup',
  'arrived_at_dropoff',
]);

const assertUnique = (ids: string[], label: string) => {
  if (ids.some((id) => typeof id !== 'string' || id.length === 0) || new Set(ids).size !== ids.length) {
    throw new RiderQueueValidationError(`${label} must contain unique, non-empty request IDs.`);
  }
};

export function appendIncomingTasks(
  currentQueue: string[],
  incomingIds: string[],
  incomingOrder: string[] = incomingIds,
): string[] {
  assertUnique(currentQueue, 'Current queue');
  assertUnique(incomingIds, 'Incoming requests');
  assertUnique(incomingOrder, 'Incoming order');

  if (incomingIds.some((id) => currentQueue.includes(id))) {
    throw new RiderQueueValidationError('Incoming requests already exist in the current queue.');
  }
  const expected = new Set(incomingIds);
  if (incomingOrder.length !== expected.size || incomingOrder.some((id) => !expected.has(id))) {
    throw new RiderQueueValidationError('Incoming order must be an exact permutation of incoming requests.');
  }

  return [...currentQueue, ...incomingOrder];
}

export function validateQueueReplacement(
  currentTasks: RiderQueueTask[],
  submittedIds: string[],
): string[] {
  const currentIds = currentTasks.map((task) => task.request_id);
  assertUnique(currentIds, 'Current queue');
  assertUnique(submittedIds, 'Submitted order');

  const expected = new Set(currentIds);
  if (submittedIds.length !== currentIds.length || submittedIds.some((id) => !expected.has(id))) {
    throw new RiderQueueValidationError('Submitted order must contain every active task exactly once.');
  }

  const submittedPositions = new Map(submittedIds.map((id, index) => [id, index]));
  const started = currentTasks.filter((task) => STARTED_STATUSES.has(task.delivery_status ?? ''));
  const unstarted = currentTasks.filter((task) => !STARTED_STATUSES.has(task.delivery_status ?? ''));
  const lastStartedPosition = Math.max(-1, ...started.map((task) => submittedPositions.get(task.request_id)!));
  const firstUnstartedPosition = Math.min(Infinity, ...unstarted.map((task) => submittedPositions.get(task.request_id)!));

  if (lastStartedPosition >= firstUnstartedPosition) {
    throw new RiderQueueValidationError('Started tasks must remain ahead of tasks that have not started.');
  }

  const submittedStarted = submittedIds.filter((id) => started.some((task) => task.request_id === id));
  if (submittedStarted.some((id, index) => id !== started[index]?.request_id)) {
    throw new RiderQueueValidationError('Started tasks must retain their relative order.');
  }

  return submittedIds;
}
