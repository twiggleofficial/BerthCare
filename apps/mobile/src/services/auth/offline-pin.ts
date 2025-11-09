import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'berthcare-offline-pin';
const DEFAULT_ALGORITHM = 'sha256';

type OfflinePinAlgorithm = typeof DEFAULT_ALGORITHM;

export type OfflinePinRecord = {
  algorithm: OfflinePinAlgorithm;
  salt: string;
  hash: string;
  createdAt: string;
};

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const encodeHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const deriveHash = async (pin: string, salt: string): Promise<string> => {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
};

const createRecord = async (pin: string): Promise<OfflinePinRecord> => {
  const salt = encodeHex(await Crypto.getRandomBytesAsync(16));
  const hash = await deriveHash(pin, salt);

  return {
    algorithm: DEFAULT_ALGORITHM,
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };
};

const PIN_PATTERN = /^\d{6}$/;

const ensureValidPin = (pin: string) => {
  if (!PIN_PATTERN.test(pin)) {
    throw new Error('Offline PIN must be exactly 6 digits.');
  }
};

const hexToBytes = (hex: string): Uint8Array => {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
};

const timingSafeEqual = (a: string, b: string): boolean => {
  const aBytes = hexToBytes(a);
  const bBytes = hexToBytes(b);
  const maxLength = Math.max(aBytes.length, bBytes.length);
  let mismatch = aBytes.length ^ bBytes.length;

  for (let i = 0; i < maxLength; i += 1) {
    const aByte = aBytes[i % aBytes.length];
    const bByte = bBytes[i % bBytes.length];
    mismatch |= aByte ^ bByte;
  }

  return mismatch === 0;
};

export const saveOfflinePin = async (pin: string): Promise<OfflinePinRecord> => {
  ensureValidPin(pin);
  const record = await createRecord(pin);
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(record), SECURE_STORE_OPTIONS);
  return record;
};

export const loadOfflinePin = async (): Promise<OfflinePinRecord | null> => {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as OfflinePinRecord;
    if (parsed.algorithm !== DEFAULT_ALGORITHM || !parsed.hash || !parsed.salt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const verifyOfflinePin = async (candidate: string): Promise<boolean> => {
  const stored = await loadOfflinePin();
  if (!stored) {
    return false;
  }

  const hash = await deriveHash(candidate, stored.salt);
  return timingSafeEqual(hash, stored.hash);
};

export const clearOfflinePin = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
};
