import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '@/utils/api';
import { triggerSync } from '@/services/SyncManager';
import { classifyConnection, getConnectionState, setConnectionState, type ConnectionState } from '@/services/connectionState';

type ConnectionContextValue = {
  state: ConnectionState;
  retry: () => Promise<void>;
  lastOnlineAt: number | null;
};

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>('checking');
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);
  const probeVersion = useRef(0);

  const applyState = useCallback((nextState: ConnectionState) => {
    const wasOnline = getConnectionState() === 'online';
    setState(nextState);
    setConnectionState(nextState);
    onlineManager.setOnline(nextState === 'online');
    if (nextState === 'online' && !wasOnline) {
      setLastOnlineAt(Date.now());
      void triggerSync();
    }
  }, []);

  const retry = useCallback(async () => {
    const version = ++probeVersion.current;
    let network: NetInfoState;
    try {
      network = await NetInfo.fetch();
    } catch {
      if (version === probeVersion.current) applyState('checking');
      return;
    }

    if (network.isConnected === false || network.isInternetReachable === false) {
      if (version === probeVersion.current) applyState(classifyConnection(network, null));
      return;
    }

    let reachable = false;
    try {
      await api.get('/api/ping', { timeout: 6000 });
      reachable = true;
    } catch {
      reachable = false;
    }
    if (version === probeVersion.current) applyState(classifyConnection(network, reachable));
  }, [applyState]);

  useEffect(() => {
    applyState('checking');
    onlineManager.setOnline(false);
    void retry();
    const unsubscribe = NetInfo.addEventListener((network) => {
      if (network.isConnected === false || network.isInternetReachable === false) {
        probeVersion.current += 1;
        applyState(classifyConnection(network, null));
      } else {
        void retry();
      }
    });
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void retry();
    });
    return () => {
      probeVersion.current += 1;
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [applyState, retry]);

  useEffect(() => {
    if (state === 'online') return undefined;
    const timer = setInterval(() => void retry(), 15000);
    return () => clearInterval(timer);
  }, [retry, state]);

  return <ConnectionContext.Provider value={{ state, retry, lastOnlineAt }}>{children}</ConnectionContext.Provider>;
}

export function useConnection(): ConnectionContextValue {
  const value = useContext(ConnectionContext);
  if (!value) throw new Error('useConnection must be used within ConnectionProvider');
  return value;
}
