import { processQueue } from './syncQueue';
import { processRiderStatusActions } from './syncQueue';
import { flushLocationOutbox } from './locationSyncService';
import { getConnectionState, subscribeConnectionState } from './connectionState';
import { AuthManager } from '@/utils/AuthManager';
import { queryClient } from '@/utils/queryClient';

/**
 * Enterprise Sync Manager (Phase 1.2)
 * 
 * Orchestrates background synchronization when connectivity changes.
 */

let isSyncing = false;
let unsubscribe: (() => void) | null = null;
let safetyTimer: ReturnType<typeof setInterval> | null = null;

export const initSyncManager = () => {
  if (unsubscribe) return;

  console.log('🚀 [SyncManager] Initializing background sync manager...');

  unsubscribe = subscribeConnectionState((state) => {
    if (state === 'online') void triggerSync();
  });

  if (getConnectionState() === 'online') void triggerSync();

  safetyTimer = setInterval(() => void triggerSync(), 5 * 60 * 1000);
};

export const triggerSync = async () => {
  if (isSyncing) return;
  
  isSyncing = true;
  try {
    if (getConnectionState() !== 'online') return;
    const user = await AuthManager.getUserData();
    if (user?.id) await processRiderStatusActions(user.id);
    await processQueue();
    await flushLocationOutbox('network_recovered');
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['riderStatusActions', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['locationOutbox', user.id] });
    }
  } catch (err) {
    console.error('[SyncManager] Sync failed:', err);
  } finally {
    isSyncing = false;
  }
};

export const stopSyncManager = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (safetyTimer) {
    clearInterval(safetyTimer);
    safetyTimer = null;
  }
};
