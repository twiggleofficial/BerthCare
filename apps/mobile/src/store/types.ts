import type { StateCreator } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export type AuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
  activationToken: string | null;
  deviceId: string | null;
};

export type ActivationMethod = 'biometric' | 'pin';

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  role: 'caregiver' | 'coordinator' | 'family' | 'operations' | 'admin';
  email?: string;
  phone?: string;
  avatarUrl?: string;
  zoneId?: string | null;
  shiftPreference?: string | null;
};

export type VisitContext = {
  id: string;
  clientName: string;
  /** ISO 8601 date-time string representing the scheduled start. */
  scheduledStart: string;
  /** ISO 8601 date-time string representing the scheduled end. */
  scheduledEnd: string;
  location?: string;
  carePlanId?: string;
};

export interface AuthSlice {
  user: UserProfile | null;
  tokens: AuthTokens;
  isAuthenticated: boolean;
  activationMethod: ActivationMethod | null;
  setUser: (user: UserProfile | null) => void;
  setTokens: (tokens: Partial<AuthTokens>) => Promise<void>;
  setActivationMethod: (method: ActivationMethod | null) => void;
  logout: () => Promise<void>;
}

export interface SyncSlice {
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  pendingChanges: number;
  beginSync: () => void;
  completeSync: (options?: { pendingChanges?: number; isError?: boolean; completedAt?: Date }) => void;
}

export interface NetworkSlice {
  isOnline: boolean;
  setIsOnline: (next: boolean) => void;
}

export interface CoreAppSlice {
  currentVisit: VisitContext | null;
  setCurrentVisit: (visit: VisitContext | null) => void;
}

export interface SecuritySlice {
  lastUnlockedAt: Date | null;
  setLastUnlockedAt: (timestamp: Date | null) => void;
}

export type AppState = AuthSlice & SyncSlice & NetworkSlice & CoreAppSlice & SecuritySlice;

export type AppStateCreator<T> = StateCreator<AppState, [], [], T>;
