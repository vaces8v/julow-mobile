import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/contexts/auth-context';

import { checkIsOnline, flushMutationQueue, scheduleSmartSyncOnReconnect } from './sync-engine';

export function CacheSyncProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    void checkIsOnline().then((online) => {
      if (online) {
        scheduleSmartSyncOnReconnect();
      }
    });

    const netSub = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (online) {
        scheduleSmartSyncOnReconnect();
      }
    });

    const onAppState = (next: AppStateStatus) => {
      if (next !== 'active') return;
      void checkIsOnline().then((online) => {
        if (online) {
          void flushMutationQueue();
        }
      });
    };

    const appSub = AppState.addEventListener('change', onAppState);

    return () => {
      netSub();
      appSub.remove();
    };
  }, [isAuthenticated]);

  return children;
}
