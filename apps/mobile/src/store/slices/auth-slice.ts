import { clearSecureTokens, persistSecureTokens } from '../token-storage';
import type { AppStateCreator, AuthSlice, AuthTokens } from '../types';

const createEmptyTokens = (): AuthTokens => ({
  accessToken: null,
  refreshToken: null,
  activationToken: null,
  deviceId: null,
});

export const createAuthSlice: AppStateCreator<AuthSlice> = (set) => ({
  user: null,
  tokens: createEmptyTokens(),
  isAuthenticated: false,
  activationMethod: null,
  setUser: (user) => set({ user }),
  setTokens: async (tokens) => {
    let nextTokens: AuthTokens = createEmptyTokens();
    set((state) => {
      nextTokens = {
        ...state.tokens,
        ...tokens,
      };

      return {
        tokens: nextTokens,
        isAuthenticated: Boolean(nextTokens.accessToken),
      };
    });

    try {
      await persistSecureTokens(nextTokens);
    } catch (error) {
      console.warn('[auth-slice] Failed to persist tokens securely', error);
    }
  },
  setActivationMethod: (method) => set({ activationMethod: method }),
  logout: async () => {
    set({
      user: null,
      tokens: createEmptyTokens(),
      isAuthenticated: false,
      activationMethod: null,
      lastUnlockedAt: null,
    });
    try {
      await clearSecureTokens();
    } catch (error) {
      console.warn('[auth-slice] Failed to clear secure tokens', error);
    }
  },
});
