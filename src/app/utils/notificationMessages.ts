type RequestUpdate = {
  request_id: string;
  status?: string;
  delivery_status?: string | null;
  actor_role?: string;
};

export function getRequestUpdateToast(data: RequestUpdate, currentRole?: string): string | null {
  const id = data.request_id.slice(-6).toUpperCase();
  if (data.delivery_status) {
    if (data.actor_role && currentRole === data.actor_role) return null;
    const statusMessages: Record<string, string> = {
      in_progress: `Delivery #${id} is on the way.`,
      arrived: `Delivery #${id} has reached a delivery stop.`,
      arrived_at_pickup: `The rider has arrived to pick up delivery #${id}.`,
      arrived_at_dropoff: `The rider has arrived at the destination for delivery #${id}.`,
      completed: `Delivery #${id} is complete.`,
      delivered: `Delivery #${id} is complete.`,
      failed: `Delivery #${id} could not be completed.`,
    };
    return statusMessages[data.delivery_status] || null;
  }
  switch (data.status) {
    case 'pending': return `Request #${id} is now under review.`;
    case 'approved': return `Request #${id} has been approved.`;
    case 'disapproved': return `Request #${id} was declined.`;
    case 'returned_for_revision': return `Request #${id} needs revision.`;
    case 'cancelled': return `Request #${id} has been cancelled.`;
    default: return null;
  }
}
