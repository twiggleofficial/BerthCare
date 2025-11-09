import { clearSecureTokens, persistSecureTokens } from '../token-storage';
import type { AppStateCreator, AuthSlice, AuthTokens } from '../types';

const createEmptyTokens = (): AuthTokens => ({
  accessToken: null,
  refreshToken: null,
  activationToken: null,
  deviceId: null,
});

export const createAuthSlice: AppStateCreator<AuthSlice> = (set, get) => ({
  user: null,
  tokens: createEmptyTokens(),
  isAuthenticated: false,
  activationMethod: null,
  setUser: (user) => set({ user }),
  setTokens: async (tokens) => {
    const nextTokens: AuthTokens = {
      ...get().tokens,
      ...tokens,
    };

    try {
      await persistSecureTokens(nextTokens);
    } catch (error) {
      console.warn('[auth-slice] Failed to persist tokens securely', error);
      throw error;
    }

    set({
      tokens: nextTokens,
      isAuthenticated: Boolean(nextTokens.accessToken),
    });
  },
  setActivationMethod: (method) => set({ activationMethod: method }),
  logout: async () => {
    try {
      await clearSecureTokens();
    } catch (error) {
      console.warn('[auth-slice] Failed to clear secure tokens', error);
      throw error;
    }
    set({
      user: null,
      tokens: createEmptyTokens(),
      isAuthenticated: false,
      activationMethod: null,
      lastUnlockedAt: null,
    });
  },
});
