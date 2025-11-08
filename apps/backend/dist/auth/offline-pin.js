import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const SCRYPT_N = 2 ** 14; // 16384
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const MAX_SCRYPT_N = 2 ** 20; // cap work factor to avoid DoS (≈ 1M)
const MAX_SCRYPT_R = 32;
const MAX_SCRYPT_P = 16;
const MAX_SCRYPT_KEYLEN = 64;
const SUPPORTED_PIN_HASH_ALGORITHMS = new Set(['scrypt']);
const scrypt = promisify(nodeScrypt);
const sanitizeNumber = (value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) => {
    if (typeof value === 'number') {
        if (Number.isFinite(value)) {
            const floored = Math.floor(value);
            if (floored >= min && floored <= max) {
                return floored;
            }
        }
    }
    else if (typeof value === 'string' && value.length > 0) {
        const numericValue = Number(value);
        if (Number.isFinite(numericValue)) {
            const floored = Math.floor(numericValue);
            if (floored >= min && floored <= max) {
                return floored;
            }
        }
    }
    return fallback;
};
const buildParams = (overrides = {}) => {
    const rawAlgorithm = typeof overrides.algorithm === 'string' ? overrides.algorithm : undefined;
    const normalizedAlgorithm = (rawAlgorithm ?? 'scrypt').toLowerCase();
    if (!SUPPORTED_PIN_HASH_ALGORITHMS.has(normalizedAlgorithm)) {
        throw new Error(`Unsupported PIN hash algorithm: ${normalizedAlgorithm}`);
    }
    const N = sanitizeNumber(overrides.N, SCRYPT_N, 2, MAX_SCRYPT_N);
    const validN = (N & (N - 1)) === 0 ? N : SCRYPT_N;
    return {
        algorithm: normalizedAlgorithm,
        N: validN,
        r: sanitizeNumber(overrides.r, SCRYPT_R, 1, MAX_SCRYPT_R),
        p: sanitizeNumber(overrides.p, SCRYPT_P, 1, MAX_SCRYPT_P),
        keylen: sanitizeNumber(overrides.keylen, SCRYPT_KEYLEN, 1, MAX_SCRYPT_KEYLEN),
    };
};
const parseStructuredParamsString = (value) => {
    try {
        const parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        const record = parsed;
        return buildParams({
            algorithm: typeof record.algorithm === 'string' ? record.algorithm : undefined,
            N: record.N,
            r: record.r,
            p: record.p,
            keylen: record.keylen,
        });
    }
    catch {
        return null;
    }
};
const parseLegacyParamsString = (value) => {
    if (!value || !value.trim()) {
        return buildParams();
    }
    const [algorithmPart, rawConfig] = value.split(':');
    const overrides = {
        algorithm: algorithmPart?.trim() || undefined,
    };
    if (rawConfig) {
        for (const entry of rawConfig.split(',')) {
            const trimmed = entry.trim();
            if (!trimmed) {
                continue;
            }
            const [rawKey, rawValue] = trimmed.split('=');
            const key = rawKey?.trim();
            const value = rawValue?.trim();
            if (!key || !value) {
                continue;
            }
            switch (key) {
                case 'N':
                    overrides.N = sanitizeNumber(value, SCRYPT_N, 2, MAX_SCRYPT_N);
                    break;
                case 'r':
                    overrides.r = sanitizeNumber(value, SCRYPT_R, 1, MAX_SCRYPT_R);
                    break;
                case 'p':
                    overrides.p = sanitizeNumber(value, SCRYPT_P, 1, MAX_SCRYPT_P);
                    break;
                case 'keylen':
                    overrides.keylen = sanitizeNumber(value, SCRYPT_KEYLEN, 1, MAX_SCRYPT_KEYLEN);
                    break;
                default:
                    break;
            }
        }
    }
    return buildParams(overrides);
};
const normalizeParams = (params) => {
    if (typeof params !== 'string') {
        return params;
    }
    const structured = parseStructuredParamsString(params);
    if (structured) {
        return structured;
    }
    return parseLegacyParamsString(params);
};
export class PinPolicyError extends Error {
    code = 'PIN_POLICY_VIOLATION';
    constructor(message) {
        super(message);
    }
}
const PIN_REGEX = /^\d{6}$/;
export const validatePin = (pin) => {
    if (!PIN_REGEX.test(pin)) {
        throw new PinPolicyError('PIN must be exactly 6 digits');
    }
};
export const hashPin = async (pin) => {
    validatePin(pin);
    const salt = randomBytes(16);
    const params = {
        algorithm: 'scrypt',
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        keylen: SCRYPT_KEYLEN,
    };
    const derivedKey = await scrypt(pin, salt, params.keylen, {
        N: params.N,
        r: params.r,
        p: params.p,
    });
    return {
        hash: derivedKey.toString('hex'),
        salt: salt.toString('hex'),
        params,
    };
};
export const verifyPin = async (pin, stored) => {
    const salt = Buffer.from(stored.salt, 'hex');
    const params = normalizeParams(stored.params);
    if (params.algorithm !== 'scrypt') {
        return false;
    }
    const derivedKey = await scrypt(pin, salt, params.keylen, {
        N: params.N,
        r: params.r,
        p: params.p,
    });
    const storedKey = Buffer.from(stored.hash, 'hex');
    if (storedKey.length !== derivedKey.length) {
        return false;
    }
    return timingSafeEqual(storedKey, derivedKey);
};
