type QueryInvalidator = {
  invalidateQueries: (query: { queryKey: readonly unknown[] }) => unknown;
};

export function getPushEventKey(data: Record<string, unknown> = {}, fallback?: string): string | null {
  const key = data.eventId || data.notificationId || data.messageId || data.message_id || fallback;
  return key == null || key === '' ? null : String(key);
}

export function invalidateRiderPushQueries(
  queryClient: QueryInvalidator,
  userId: string | undefined,
  data: Record<string, unknown> = {},
): void {
  if (!userId) return;
  queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
  queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
  queryClient.invalidateQueries({ queryKey: ['historyTasks', userId] });
  const requestId = data.request_id || data.requestId;
  if (requestId) queryClient.invalidateQueries({ queryKey: ['job', userId, String(requestId)] });
}
