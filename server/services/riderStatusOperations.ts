import { createHash } from 'crypto';

export type RiderStatusOperation = {
  rider_id: string;
  operation_id: string;
  request_id: string;
  payload_hash: string;
  delivery_status: string;
  response_json: Record<string, unknown>;
};

export function hashRiderStatusPayload(input: {
  requestId: string;
  status: string;
  remark: string;
  timestamp: string | null;
}): string {
  const canonical = JSON.stringify({
    requestId: input.requestId,
    status: input.status,
    remark: input.remark,
    timestamp: input.timestamp,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export async function findRiderOperation(connection: any, riderId: string, operationId: string): Promise<RiderStatusOperation | null> {
  const [rows] = await connection.query(
    'SELECT rider_id, operation_id, request_id, payload_hash, delivery_status, response_json FROM rider_status_operations WHERE rider_id=? AND operation_id=? LIMIT 1',
    [riderId, operationId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    response_json: typeof row.response_json === 'string' ? JSON.parse(row.response_json) : row.response_json,
  };
}

export async function recordRiderOperation(connection: any, operation: RiderStatusOperation): Promise<void> {
  await connection.query(
    `INSERT INTO rider_status_operations
      (rider_id, operation_id, request_id, payload_hash, delivery_status, response_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [operation.rider_id, operation.operation_id, operation.request_id, operation.payload_hash,
      operation.delivery_status, JSON.stringify(operation.response_json)],
  );
}
