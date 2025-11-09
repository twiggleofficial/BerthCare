import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState } from '../../store/types';

const syncMock = vi.fn();

const mockAppState: AppState = {
  user: null,
  tokens: {
    accessToken: 'token',
    refreshToken: 'refresh',
    activationToken: null,
    deviceId: 'device',
  },
  isAuthenticated: true,
  activationMethod: null,
  syncStatus: 'idle',
  lastSyncTime: null,
  pendingChanges: 0,
  isOnline: true,
  currentVisit: null,
  lastUnlockedAt: null,
  beginSync: vi.fn(),
  completeSync: vi.fn(),
  setUser: vi.fn(),
  setTokens: vi.fn(async () => {}),
  setActivationMethod: vi.fn(),
  logout: vi.fn(async () => {}),
  setIsOnline: vi.fn(),
  setCurrentVisit: vi.fn(),
  setLastUnlockedAt: vi.fn(),
};

vi.mock('../api/client', () => ({ apiClient: {} }));
vi.mock('../../database', () => ({ database: {} }));
vi.mock('./SyncQueue', () => ({
  SyncQueue: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('./SyncEngine', () => ({
  SyncEngine: vi.fn().mockImplementation(() => ({
    sync: syncMock,
  })),
}));
type UseAppStoreMock = (() => AppState) & {
  getState: () => AppState;
};

vi.mock('../../store', () => {
  const useAppStore = Object.assign(() => mockAppState, {
    getState: () => mockAppState,
  }) as UseAppStoreMock;
  return { useAppStore };
});

import {
  __resetSyncStateForTests,
  executeBackgroundSync,
  triggerForegroundSync,
} from './sync-runner';

describe('sync-runner', () => {
  beforeEach(() => {
    mockAppState.isAuthenticated = true;
    mockAppState.tokens.accessToken = 'token';
    syncMock.mockReset();
    syncMock.mockResolvedValue({ status: 'success' });
    __resetSyncStateForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips foreground sync when there is no authenticated session', async () => {
    mockAppState.isAuthenticated = false;

    const outcome = await triggerForegroundSync('manual');

    expect(outcome).toBe('skipped');
    expect(syncMock).not.toHaveBeenCalled();
  });

  it('surfaces offline status when the engine reports offline', async () => {
    syncMock.mockResolvedValueOnce({ status: 'offline' });

    const outcome = await triggerForegroundSync('manual');

    expect(outcome).toBe('offline');
  });

  it('applies exponential backoff for background failures', async () => {
    vi.useFakeTimers();
    syncMock.mockRejectedValueOnce(new Error('network down'));

    const first = await executeBackgroundSync();
    expect(first).toBe('failed');

    const second = await executeBackgroundSync();
    expect(second).toBe('skipped');

    vi.advanceTimersByTime(60_000);
    syncMock.mockResolvedValue({ status: 'success' });

    const third = await executeBackgroundSync();
    expect(third).toBe('success');

    const fourth = await executeBackgroundSync();
    expect(fourth).toBe('success');
  });
});
