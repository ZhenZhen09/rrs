export type WeeklyResolutionDetails = {
  outcome: 'Completed' | 'Failed' | 'Cancelled' | 'Open';
  overdue: boolean;
  resolvedBy: string;
  resolvedAt: string | null;
};

export const getWeeklyScheduleDetailLabels = (request: { overdue_at?: string | null }) => (
  request.overdue_at
    ? ['Destination building', 'Transaction #', 'Scheduled', 'Overdue at', 'Started', 'Ended', 'Resolved by']
    : ['Destination building', 'Transaction #', 'Scheduled', 'Started', 'Ended', 'Resolved by']
);

export const getWeeklyResolverLabel = (outcome: string) => {
  if (outcome === 'Completed') return 'Completed by';
  if (outcome === 'Failed') return 'Failed by';
  if (outcome === 'Cancelled') return 'Cancelled by';
  return 'Resolved by';
};

export const getWeeklyStartedAt = (request: {
  delivery_status?: string | null;
  overdue_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  resolved_by_role?: string | null;
}) => {
  if (request.started_at) return request.started_at;

  const deliveryStatus = String(request.delivery_status || '').toLowerCase();
  const isTerminal = ['completed', 'delivered', 'failed', 'cancelled'].includes(deliveryStatus);
  const isAdminResolution = String(request.resolved_by_role || '').toLowerCase() === 'admin';

  return request.overdue_at && isTerminal && isAdminResolution
    ? request.finished_at || null
    : null;
};

export const getWeeklyResolutionDetails = (request: {
  status?: string | null;
  delivery_status?: string | null;
  overdue_at?: string | null;
  finished_at?: string | null;
  resolved_by_role?: string | null;
  resolved_by_name?: string | null;
}): WeeklyResolutionDetails => {
  const requestStatus = String(request.status || '').toLowerCase();
  const deliveryStatus = String(request.delivery_status || '').toLowerCase();
  const outcome = requestStatus === 'disapproved' || requestStatus === 'cancelled' || deliveryStatus === 'cancelled'
    ? 'Cancelled'
    : deliveryStatus === 'completed' || deliveryStatus === 'delivered'
    ? 'Completed'
    : deliveryStatus === 'failed'
      ? 'Failed'
      : deliveryStatus === 'cancelled'
        ? 'Cancelled'
        : 'Open';
  const role = String(request.resolved_by_role || '').toLowerCase();
  const roleLabel = role === 'admin' ? 'Admin' : role === 'rider' ? 'Rider' : '';
  const historicalDisapproval = requestStatus === 'disapproved' && !request.resolved_by_name && !roleLabel;
  const actorName = request.resolved_by_name || (roleLabel || (historicalDisapproval ? 'Admin' : (request.finished_at ? 'Unknown' : '—')));
  const resolverRole = roleLabel || (historicalDisapproval ? 'Admin' : '');

  return {
    outcome,
    overdue: Boolean(request.overdue_at),
    resolvedBy: resolverRole && !historicalDisapproval ? `${actorName} (${resolverRole})` : actorName,
    resolvedAt: request.finished_at || null,
  };
};
