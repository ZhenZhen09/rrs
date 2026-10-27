import type { NetInfoState } from '@react-native-community/netinfo';

export type ConnectionState = 'checking' | 'online' | 'no_network' | 'service_unavailable';

let currentState: ConnectionState = 'checking';
const listeners = new Set<(state: ConnectionState) => void>();

export function classifyConnection(network: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>, serviceReachable: boolean | null): ConnectionState {
  if (network.isConnected === false || network.isInternetReachable === false) return 'no_network';
  if (network.isConnected === null && network.isInternetReachable === null) return 'checking';
  if (serviceReachable === true) return 'online';
  if (serviceReachable === false) return 'service_unavailable';
  return 'checking';
}

export function getConnectionState(): ConnectionState {
  return currentState;
}

export function setConnectionState(state: ConnectionState): void {
  if (state === currentState) return;
  currentState = state;
  listeners.forEach((listener) => listener(state));
}

export function subscribeConnectionState(listener: (state: ConnectionState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
