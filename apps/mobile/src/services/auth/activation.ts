import type { UserProfile } from '../../store/types';
import { apiClient } from '../api';

export type ActivationRequestPayload = {
  email: string;
  activationCode: string;
  deviceFingerprint: string;
  appVersion: string;
};

export type ActivationResponse = {
  activationToken: string;
  user: UserProfile;
  requiresMfa: boolean;
};

export type ActivationCompletionPayload = {
  activationToken: string;
  pin: string;
  deviceName: string;
  supportsBiometric: boolean;
};

export type ActivationCompletionResponse = {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
};

// Activation API contract mirrors POST /v1/auth/activate from the backend router tests.
export const requestActivation = async (
  payload: ActivationRequestPayload,
): Promise<ActivationResponse> => {
  const { data } = await apiClient.post<ActivationResponse>('/auth/activate', payload);
  return data;
};

// Mirrors POST /v1/auth/activate/complete from backend router tests.
export const completeActivation = async (
  payload: ActivationCompletionPayload,
): Promise<ActivationCompletionResponse> => {
  const { data } = await apiClient.post<ActivationCompletionResponse>(
    '/auth/activate/complete',
    payload,
  );
  return data;
};
