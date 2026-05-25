import NetInfo from '@react-native-community/netinfo';
import { processQueue } from './syncQueue';

/**
 * Enterprise Sync Manager (Phase 1.2)
 * 
 * Orchestrates background synchronization when connectivity changes.
 */

let isSyncing = false;
let unsubscribe: (() => void) | null = null;

export const initSyncManager = () => {
  if (unsubscribe) return;

  console.log('🚀 [SyncManager] Initializing background sync manager...');

  // 1. Monitor network changes
  unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable) {
      console.log('[SyncManager] Online detected. Triggering queue flush...');
      triggerSync();
    }
  });

  // 2. Perform initial sync check
  triggerSync();

  // 3. Periodic safety sync (every 5 minutes)
  setInterval(() => {
    triggerSync();
  }, 5 * 60 * 1000);
};

export const triggerSync = async () => {
  if (isSyncing) return;
  
  isSyncing = true;
  try {
    const state = await NetInfo.fetch();
    if (state.isConnected && state.isInternetReachable) {
      await processQueue();
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
};
