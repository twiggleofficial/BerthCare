import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { AuthTokens } from './types';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const TOKEN_KEYS: Record<keyof AuthTokens, string> = {
  accessToken: 'berthcare-token-access',
  refreshToken: 'berthcare-token-refresh',
  activationToken: 'berthcare-token-activation',
  deviceId: 'berthcare-token-device-id',
};

const LEGACY_STORAGE_KEY = 'berthcare-app-store';

const emptyTokens = (): AuthTokens => ({
  accessToken: null,
  refreshToken: null,
  activationToken: null,
  deviceId: null,
});

const setSecureItem = async (key: string, value: string | null): Promise<void> => {
  if (value === null || value === undefined) {
    await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
    return;
  }

  await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
};

const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    const value = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
    return value ?? null;
  } catch (error) {
    console.warn('[token-storage] Failed to read secure value', { key, error });
    return null;
  }
};

export const readSecureTokens = async (): Promise<AuthTokens> => {
  const [accessToken, refreshToken, activationToken, deviceId] = await Promise.all([
    getSecureItem(TOKEN_KEYS.accessToken),
    getSecureItem(TOKEN_KEYS.refreshToken),
    getSecureItem(TOKEN_KEYS.activationToken),
    getSecureItem(TOKEN_KEYS.deviceId),
  ]);

  return {
    accessToken,
    refreshToken,
    activationToken,
    deviceId,
  };
};

export const persistSecureTokens = async (tokens: AuthTokens): Promise<void> => {
  try {
    await Promise.all(
      (Object.keys(TOKEN_KEYS) as Array<keyof AuthTokens>).map((key) =>
        setSecureItem(TOKEN_KEYS[key], tokens[key]),
      ),
    );
  } catch (error) {
    console.warn('[token-storage] Failed to persist secure tokens', error);
    throw error;
  }
};

export const clearSecureTokens = async (): Promise<void> => {
  try {
    await Promise.all(
      Object.values(TOKEN_KEYS).map((key) =>
        SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS),
      ),
    );
  } catch (error) {
    console.warn('[token-storage] Failed to clear secure tokens', error);
    throw error;
  }
};

export const getSecureTokenValue = async (tokenKey: keyof AuthTokens): Promise<string | null> => {
  await ensureLegacyTokenMigration();
  return getSecureItem(TOKEN_KEYS[tokenKey]);
};

const hasAnyToken = (tokens: AuthTokens | undefined): boolean => {
  if (!tokens) {
    return false;
  }

  return Boolean(tokens.accessToken || tokens.refreshToken || tokens.activationToken || tokens.deviceId);
};

type LegacyPersistedState = {
  state?: {
    tokens?: AuthTokens;
    isAuthenticated?: boolean;
    [key: string]: unknown;
  };
  version?: number;
};

const migrateLegacyTokens = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as LegacyPersistedState;
    const legacyTokens = parsed?.state?.tokens;
    if (!hasAnyToken(legacyTokens)) {
      return;
    }

    const tokensToPersist: AuthTokens = {
      accessToken: legacyTokens?.accessToken ?? null,
      refreshToken: legacyTokens?.refreshToken ?? null,
      activationToken: legacyTokens?.activationToken ?? null,
      deviceId: legacyTokens?.deviceId ?? null,
    };

    await persistSecureTokens(tokensToPersist);

    if (parsed.state) {
      parsed.state.tokens = emptyTokens();
      parsed.state.isAuthenticated = false;
      await AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch (error) {
    console.warn('[token-storage] Failed to migrate legacy tokens', error);
  }
};

let migrationPromise: Promise<void> | null = null;

export const ensureLegacyTokenMigration = async (): Promise<void> => {
  if (!migrationPromise) {
    migrationPromise = migrateLegacyTokens();
  }
  await migrationPromise;
};

export const loadTokensFromSecureStore = async (): Promise<AuthTokens> => {
  await ensureLegacyTokenMigration();

  try {
    const tokens = await readSecureTokens();
    return tokens;
  } catch (error) {
    console.warn('[token-storage] Failed to load secure tokens', error);
    return emptyTokens();
  }
};
