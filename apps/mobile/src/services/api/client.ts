import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import axios from 'axios';

import { useAppStore } from '../../store';
import { getSecureTokenValue } from '../../store/token-storage';

const API_BASE_URLS = {
  development: 'http://localhost:3000/v1',
  staging: 'https://api-staging.berthcare.ca/v1',
  production: 'https://api.berthcare.ca/v1',
} as const;

/**
 * Base URLs follow the API Architecture contract outlined in
 * `project-documentation/architecture-output.md`.
 */
const resolveBaseURL = (): string => {
  const override = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof override === 'string' && override.length > 0) {
    return override;
  }

  const appEnv = (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as keyof typeof API_BASE_URLS;
  return API_BASE_URLS[appEnv] ?? API_BASE_URLS.development;
};

const BASE_URL = resolveBaseURL();
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export type ApiRequestMetadata = {
  startTime: number;
};

export type ApiRequestConfig<D = unknown> = InternalAxiosRequestConfig<D> & {
  metadata?: ApiRequestMetadata;
  retryCount?: number;
};

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

let isHandlingUnauthorized = false;

const isDebugLoggingEnabled =
  process.env.NODE_ENV === 'development' || process.env.API_DEBUG === 'true';

const debugLog = (...args: unknown[]) => {
  if (isDebugLoggingEnabled) {
    console.log('[api]', ...args);
  }
};

const attachMetadata = (config: ApiRequestConfig) => {
  config.metadata = { startTime: Date.now() };
  return config;
};

const logRequest = (config: ApiRequestConfig) => {
  const method = config.method?.toUpperCase() ?? 'GET';
  debugLog('→', method, config.baseURL ? `${config.baseURL}${config.url}` : config.url);
};

const logResponse = (response: AxiosResponse) => {
  const config = response.config as ApiRequestConfig;
  const duration = config.metadata ? Date.now() - config.metadata.startTime : undefined;
  const method = config.method?.toUpperCase() ?? 'GET';
  const info = [
    '←',
    method,
    response.status,
    config.baseURL ? `${config.baseURL}${config.url}` : config.url,
  ];

  if (typeof duration === 'number') {
    info.push(`${duration}ms`);
  }

  debugLog(...info);
};

const logError = (error: AxiosError) => {
  if (!error.config) {
    debugLog('✕', error.message);
    return;
  }

  const config = error.config as ApiRequestConfig;
  const method = config.method?.toUpperCase() ?? 'GET';
  const attempt = (config.retryCount ?? 0) + 1;
  const status = error.response?.status ?? 'network';

  debugLog('✕', method, status, config.url, `attempt ${attempt}`, error.message);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (error: AxiosError) => {
  if (!error.config) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return RETRYABLE_STATUSES.has(error.response.status);
};

const handleUnauthorized = async () => {
  if (isHandlingUnauthorized) {
    return;
  }

  isHandlingUnauthorized = true;
  try {
    await useAppStore.getState().logout();
  } finally {
    isHandlingUnauthorized = false;
  }
};

apiClient.interceptors.request.use(async (config) => {
  const enrichedConfig = attachMetadata(config as ApiRequestConfig);
  const token = await getSecureTokenValue('accessToken');

  if (token && !enrichedConfig.headers?.Authorization) {
    const headers = enrichedConfig.headers ?? {};
    headers.Authorization = `Bearer ${token}`;
    enrichedConfig.headers = headers;
  }

  logRequest(enrichedConfig);
  return enrichedConfig;
});

apiClient.interceptors.response.use(
  (response) => {
    logResponse(response);
    return response;
  },
  async (error: AxiosError) => {
    logError(error);

    const config = error.config as ApiRequestConfig | undefined;
    if (!config) {
      throw error;
    }

    if (error.response?.status === 401) {
      await handleUnauthorized();
      throw error;
    }

    const currentRetryCount = config.retryCount ?? 0;
    if (currentRetryCount >= MAX_RETRIES || !shouldRetry(error)) {
      throw error;
    }

    config.retryCount = currentRetryCount + 1;
    const backoffDelay = Math.min(BASE_RETRY_DELAY_MS * 2 ** currentRetryCount, 4_000);
    await wait(backoffDelay);

    return apiClient(config);
  },
);

export { apiClient, BASE_URL as API_BASE_URL };
