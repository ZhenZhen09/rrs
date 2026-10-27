import { create } from 'zustand';
import { PresenceStatus, RiderLocation, RealTimeToast } from '../context/RealTimeContext';

interface RealTimeState {
  riderLocations: Map<string, RiderLocation>;
  riderPresence: Map<string, PresenceStatus>;
  isConnected: boolean;
  lastRequestUpdate: number;
  toast: RealTimeToast | null;
  setRiderLocations: (updater: (prev: Map<string, RiderLocation>) => Map<string, RiderLocation>) => void;
  setRiderPresence: (presence: Map<string, PresenceStatus>) => void;
  setConnectionState: (isConnected: boolean) => void;
  triggerRequestUpdate: () => void;
  showToast: (message: string, type?: RealTimeToast['type']) => void;
  hideToast: () => void;
}

export const useRealTimeStore = create<RealTimeState>((set) => ({
  riderLocations: new Map(),
  riderPresence: new Map(),
  isConnected: false,
  lastRequestUpdate: 0,
  toast: null,
  setRiderLocations: (updater) => set((state) => ({ riderLocations: updater(state.riderLocations) })),
  setRiderPresence: (presence) => set({ riderPresence: presence }),
  setConnectionState: (isConnected) => set({ isConnected }),
  triggerRequestUpdate: () => set({ lastRequestUpdate: Date.now() }),
  showToast: (message, type = 'info') => set({ toast: { id: Date.now().toString(), message, type } }),
  hideToast: () => set({ toast: null }),
}));
