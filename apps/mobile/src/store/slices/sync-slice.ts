import type { AppStateCreator, SyncSlice } from '../types';

export const createSyncSlice: AppStateCreator<SyncSlice> = (set, get) => ({
  syncStatus: 'idle',
  lastSyncTime: null,
  pendingChanges: 0,
  beginSync: () => set({ syncStatus: 'syncing' }),
  completeSync: (options) => {
    const state = get();
    const {
      pendingChanges = state.pendingChanges,
      isError = false,
      completedAt = new Date(),
    } = options ?? {};

    const pendingNumber = Number(pendingChanges);
    const sanitizedPending =
      Math.max(0, Math.floor(Number.isFinite(pendingNumber) ? pendingNumber : 0));

    set({
      syncStatus: isError ? 'error' : 'idle',
      lastSyncTime: isError ? state.lastSyncTime : completedAt,
      pendingChanges: sanitizedPending,
    });
  },
});
