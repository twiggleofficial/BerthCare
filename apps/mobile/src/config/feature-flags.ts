const env = process.env;

const optionalIndexFlag = env?.EXPO_PUBLIC_DB_OPTIONAL_INDEXES;
export const ENABLE_OPTIONAL_DB_INDEXES =
  typeof optionalIndexFlag === 'string' && optionalIndexFlag.toLowerCase() === 'true';

const thresholdInput = env?.EXPO_PUBLIC_DB_WRITE_P95_THRESHOLD_MS;
const parsedThreshold =
  typeof thresholdInput === 'string' && thresholdInput.trim().length
    ? Number(thresholdInput)
    : Number.NaN;
export const WRITE_LATENCY_ROLLBACK_THRESHOLD_MS = Number.isFinite(parsedThreshold)
  ? parsedThreshold
  : 75;
