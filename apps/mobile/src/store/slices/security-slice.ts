import type { AppStateCreator, SecuritySlice } from '../types';

export const createSecuritySlice: AppStateCreator<SecuritySlice> = (set) => ({
  lastUnlockedAt: null,
  setLastUnlockedAt: (timestamp) => set({ lastUnlockedAt: timestamp }),
});
