import type { BinaryLike, ScryptOptions } from 'node:crypto';
import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const SCRYPT_N = 2 ** 14; // 16384
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;

const scrypt = promisify(nodeScrypt) as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options?: ScryptOptions,
) => Promise<Buffer>;

export type PinHash = {
  hash: string;
  salt: string;
  params: string;
};

export class PinPolicyError extends Error {
  readonly code = 'PIN_POLICY_VIOLATION';

  constructor(message: string) {
    super(message);
  }
}

const PIN_REGEX = /^\d{6}$/;

export const validatePin = (pin: string): void => {
  if (!PIN_REGEX.test(pin)) {
    throw new PinPolicyError('PIN must be exactly 6 digits');
  }
};

export const hashPin = async (pin: string): Promise<PinHash> => {
  validatePin(pin);

  const salt = randomBytes(16);
  const derivedKey = await scrypt(pin, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return {
    hash: derivedKey.toString('hex'),
    salt: salt.toString('hex'),
    params: `scrypt:N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P},keylen=${SCRYPT_KEYLEN}`,
  };
};

export const verifyPin = async (pin: string, stored: PinHash): Promise<boolean> => {
  const salt = Buffer.from(stored.salt, 'hex');
  const derivedKey = await scrypt(pin, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  const storedKey = Buffer.from(stored.hash, 'hex');

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
};
