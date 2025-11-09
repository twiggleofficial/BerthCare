import { apiClient } from '../api';

export type SessionRefreshPayload = {
  refreshToken: string;
  deviceId: string;
};

export type SessionRefreshResponse = {
  accessToken: string;
  refreshToken?: string;
  deviceId: string;
};

export const refreshSession = async (
  payload: SessionRefreshPayload,
): Promise<SessionRefreshResponse> => {
  const { data } = await apiClient.post<SessionRefreshResponse>(
    '/auth/session/refresh',
    payload,
  );
  return data;
};
