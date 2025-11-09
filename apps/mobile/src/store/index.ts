import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

import { createAppSlice } from './slices/app-slice';
import { createAuthSlice } from './slices/auth-slice';
import { createNetworkSlice } from './slices/network-slice';
import { createSecuritySlice } from './slices/security-slice';
import { createSyncSlice } from './slices/sync-slice';
import type { AppState, AppStateCreator } from './types';

/**
 * Global caregiver-first store derived from the State Management Architecture blueprint
 * in `project-documentation/architecture-output.md`.
 */
const createStoreSlices: AppStateCreator<AppState> = (set, get, store) => ({
  ...createAuthSlice(set, get, store),
  ...createSyncSlice(set, get, store),
  ...createNetworkSlice(set, get, store),
  ...createAppSlice(set, get, store),
  ...createSecuritySlice(set, get, store),
});

type PersistedAppState = Omit<AppState, 'lastSyncTime' | 'lastUnlockedAt'> & {
  lastSyncTime: Date | string | null;
  lastUnlockedAt: Date | string | null;
};

const ensureDate = (value: Date | string | null): Date | null => {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const normalizeState = (state: PersistedAppState): AppState => ({
  ...state,
  lastSyncTime: ensureDate(state.lastSyncTime),
  lastUnlockedAt: ensureDate(state.lastUnlockedAt),
});

export const useAppStore = create<AppState>()(
  devtools(
    persist(createStoreSlices, {
      name: 'berthcare-app-store',
      version: 1,
      storage: createJSONStorage<AppState>(() => AsyncStorage),
      merge: (persistedState, currentState) => {
        if (!persistedState) {
          return currentState;
        }

        return normalizeState({
          ...currentState,
          ...(persistedState as PersistedAppState),
        });
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.lastSyncTime = ensureDate(state.lastSyncTime);
          state.lastUnlockedAt = ensureDate(state.lastUnlockedAt);
        }
      },
    }),
    { name: 'berthcare-app-store' },
  ),
);

export const authSelectors = {
  user: (state: AppState) => state.user,
  tokens: (state: AppState) => state.tokens,
  isAuthenticated: (state: AppState) => state.isAuthenticated,
};

export const syncSelectors = {
  status: (state: AppState) => state.syncStatus,
  lastSyncTime: (state: AppState) => state.lastSyncTime,
  pendingChanges: (state: AppState) => state.pendingChanges,
};

export const networkSelectors = {
  isOnline: (state: AppState) => state.isOnline,
};

export const appSelectors = {
  currentVisit: (state: AppState) => state.currentVisit,
};

export const securitySelectors = {
  lastUnlockedAt: (state: AppState) => state.lastUnlockedAt,
};
