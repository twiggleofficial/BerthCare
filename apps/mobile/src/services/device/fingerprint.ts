import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { APP_VERSION } from '../../config/app';

const STORAGE_KEY = 'berthcare-device-fingerprint';
let inflightFingerprint: Promise<string> | null = null;

const hashSeed = (input: string) => {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(16).padStart(16, '0');
};

const buildDeviceSignature = () => {
  const signatureParts = [Platform.OS, String(Platform.Version), APP_VERSION];

  return signatureParts.join('|');
};

const createFingerprintValue = () => {
  const deviceSignature = buildDeviceSignature();
  const randomSalt = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `bc_${hashSeed(`${deviceSignature}|${randomSalt}`)}`;
};

export const getDeviceFingerprint = async (): Promise<string> => {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  if (inflightFingerprint) {
    return inflightFingerprint;
  }

  inflightFingerprint = (async () => {
    const fingerprint = createFingerprintValue();
    await AsyncStorage.setItem(STORAGE_KEY, fingerprint);
    return fingerprint;
  })();

  try {
    const fingerprint = await inflightFingerprint;
    return fingerprint;
  } finally {
    inflightFingerprint = null;
  }
};
