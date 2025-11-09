import type { AppStateCreator, NetworkSlice } from '../types';

export const createNetworkSlice: AppStateCreator<NetworkSlice> = (set) => ({
  isOnline: true,
  setIsOnline: (next) => set({ isOnline: next }),
});
