import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

/**
 * Global Query Client config for Offline-First
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // Keep in garbage collector for 24 hours
      staleTime: 1000 * 60 * 5,    // Consider data "fresh" for 5 mins
      
      // --- ROBUST RETRY LOGIC ---
      retry: (failureCount, error: any) => {
        // Don't retry if it's a 4xx error (client error)
        if (error?.response?.status < 500 && error?.response?.status >= 400) return false;
        // Retry up to 3 times for network/server errors
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 30 * 1000),
      
      refetchOnWindowFocus: true,
      refetchOnReconnect: 'always',
    },
  },
});

/**
 * Offline Persistence: This saves the cache to AsyncStorage
 */
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

// Expo Router statically renders routes in a Node environment where browser
// storage is unavailable. Hydrate/persist only after a real browser exists.
if (typeof window !== 'undefined') {
  persistQueryClient({
    queryClient,
    persister: asyncStoragePersister,
    maxAge: 1000 * 60 * 60 * 24, // Persist for 24 hours
  });
}
