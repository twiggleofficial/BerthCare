import { useEffect } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

import { useAppStore } from '../store';

const resolveOnlineStatus = (state: NetInfoState): boolean => {
  return state.isConnected === true && state.isInternetReachable === true;
};

/**
 * Keeps Zustand network state aligned with device connectivity per the
 * Offline-First Architecture contract documented in
 * `project-documentation/architecture-output.md`.
 */
export function NetworkListener() {
  const setIsOnline = useAppStore((state) => state.setIsOnline);

  useEffect(() => {
    let isMounted = true;

    const applyStatus = (state: NetInfoState) => {
      if (!isMounted) {
        return;
      }

      setIsOnline(resolveOnlineStatus(state));
    };

    NetInfo.fetch()
      .then(applyStatus)
      .catch(() => {
        if (isMounted) {
          setIsOnline(false);
        }
      });

    const unsubscribe = NetInfo.addEventListener(applyStatus);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setIsOnline]);

  return null;
}
