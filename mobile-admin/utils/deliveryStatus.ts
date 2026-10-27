export type DeliveryStatusPresentation = {
  label: string;
  detail: string;
  tone: 'live' | 'success' | 'danger' | 'neutral';
};

export const getDeliveryStatusPresentation = (status?: string): DeliveryStatusPresentation => {
  switch (status) {
    case 'in_progress':
      return { label: 'ON ROUTE', detail: 'Live tracking', tone: 'live' };
    case 'completed':
      return { label: 'COMPLETE', detail: 'Delivery completed', tone: 'success' };
    case 'failed':
      return { label: 'FAILED', detail: 'Delivery failed', tone: 'danger' };
    default:
      return { label: 'ASSIGNED', detail: 'Waiting for rider to start', tone: 'neutral' };
  }
};

