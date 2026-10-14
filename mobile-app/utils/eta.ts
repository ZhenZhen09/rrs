export type EtaStatus = 'available' | 'stale' | 'unavailable' | 'completed';

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  calculatedAt: string;
};

export const formatDuration = (durationSeconds: number): string => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 'Less than 1 min';
  const totalMinutes = Math.ceil(durationSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
};

export const formatOverdueDuration = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
  const totalMinutes = Math.floor(minutes);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
};


export const getEtaStatus = (input: {
  deliveryStatus?: string;
  currentLocationAt?: number;
  calculatedAt?: number;
  nowMs: number;
  freshnessLimitMs: number;
}): EtaStatus => {
  if (input.deliveryStatus === 'completed') return 'completed';
  if (!input.currentLocationAt || !input.calculatedAt) return 'unavailable';
  if (input.nowMs - input.currentLocationAt > input.freshnessLimitMs) return 'stale';
  if (input.nowMs - input.calculatedAt > input.freshnessLimitMs) return 'stale';
  return 'available';
};

export const formatEtaTime = (nowMs: number, durationSeconds: number): string =>
  new Date(nowMs + Math.max(0, durationSeconds) * 1000).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
