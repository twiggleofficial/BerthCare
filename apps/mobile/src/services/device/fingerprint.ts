import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { APP_VERSION } from '../../config/app';

const STORAGE_KEY = 'berthcare-device-fingerprint';
let inflightFingerprint: Promise<string> | null = null;

const bytesToHex = (bytes: Uint8Array) => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const buildDeviceSignature = () => {
  const signatureParts = [Platform.OS, String(Platform.Version), APP_VERSION];

  return signatureParts.join('|');
};

const createFingerprintValue = async () => {
  const deviceSignature = buildDeviceSignature();
  const randomSaltBytes = await Crypto.getRandomBytesAsync(32);
  const randomSalt = bytesToHex(randomSaltBytes);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${deviceSignature}|${randomSalt}`,
  );
  return `bc_${digest}`;
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
    const fingerprint = await createFingerprintValue();
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
