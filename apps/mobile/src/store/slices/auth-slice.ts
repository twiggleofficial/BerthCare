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
  setTokens: (tokens) =>
    set((state) => {
      const nextTokens: AuthTokens = {
        ...state.tokens,
        ...tokens,
      };

      return {
        tokens: nextTokens,
        isAuthenticated: Boolean(nextTokens.accessToken),
      };
    }),
  setActivationMethod: (method) => set({ activationMethod: method }),
  logout: () => {
    set({
      user: null,
      tokens: createEmptyTokens(),
      isAuthenticated: false,
      activationMethod: null,
      lastUnlockedAt: null,
    });
    return Promise.resolve();
  },
});
