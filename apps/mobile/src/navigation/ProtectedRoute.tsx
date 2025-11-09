import type { ReactNode} from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AppStateStatus} from 'react-native';
import {
  ActivityIndicator,
  AppState,
  Modal,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import type { AxiosError } from 'axios';

import { Button, Input, Typography } from '../components';
import type { BerthcareTheme } from '../design-system';
import {
  checkBiometricSupport,
  promptBiometricAuth,
  type BiometricSupport,
} from '../services/device/biometrics';
import { verifyOfflinePin } from '../services/auth/offline-pin';
import { refreshSession } from '../services/auth/session';
import { useAppStore } from '../store';
import type { ActivationMethod } from '../store/types';

type ProtectedRouteProps = {
  children: ReactNode;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

const PIN_LENGTH = 6;
const UNLOCK_TIMEOUT_MS = 5 * 60 * 1000;

const resolveBiometricLabel = (support: BiometricSupport | null): string => {
  if (!support || !support.primaryType) {
    return 'biometric unlock';
  }

  if (support.primaryType === 'face') {
    return Platform.OS === 'ios' ? 'Face ID' : 'face unlock';
  }

  if (support.primaryType === 'fingerprint') {
    return Platform.OS === 'ios' ? 'Touch ID' : 'fingerprint unlock';
  }

  return 'iris unlock';
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const theme = useTheme<BerthcareTheme>();
  const tokens = useAppStore((state) => state.tokens);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const activationMethod = useAppStore((state) => state.activationMethod);
  const setTokens = useAppStore((state) => state.setTokens);
  const logout = useAppStore((state) => state.logout);
  const lastUnlockedAt = useAppStore((state) => state.lastUnlockedAt);
  const setLastUnlockedAt = useAppStore((state) => state.setLastUnlockedAt);

  const [isLocked, setIsLocked] = useState(false);
  const [unlockMode, setUnlockMode] = useState<ActivationMethod>('pin');
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockStatus, setUnlockStatus] = useState<'idle' | 'verifying'>('idle');
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [biometricSupport, setBiometricSupport] = useState<BiometricSupport | null>(null);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(false);

  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const activationToken = tokens.activationToken;
  const refreshToken = tokens.refreshToken;
  const deviceId = tokens.deviceId;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setUnlockMode(activationMethod ?? 'pin');
  }, [activationMethod]);

  useEffect(() => {
    if (activationMethod !== 'biometric') {
      setBiometricSupport(null);
      return;
    }

    let isMounted = true;
    setIsCheckingBiometrics(true);
    void checkBiometricSupport()
      .then((support) => {
        if (isMounted) {
          setBiometricSupport(support);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingBiometrics(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activationMethod]);

  const canUseBiometric =
    activationMethod === 'biometric' &&
    Boolean(biometricSupport?.available && biometricSupport.enrolled);
  const biometricLabel = resolveBiometricLabel(biometricSupport);

  const sanitizePin = useCallback((value: string) => value.replace(/\D/g, '').slice(0, PIN_LENGTH), []);

  const routeToActivation = useCallback(async () => {
    await logout();
    router.replace('/activation');
  }, [logout, router]);

  const routeToBiometricSetup = useCallback(() => {
    router.replace('/biometric-setup');
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (activationToken) {
        routeToBiometricSetup();
      } else {
        void routeToActivation();
      }
    }
  }, [activationToken, isAuthenticated, routeToActivation, routeToBiometricSetup]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLocked(false);
      return;
    }

    const lastUnlockTimestamp = lastUnlockedAt?.getTime();
    const expired =
      !lastUnlockTimestamp || Date.now() - lastUnlockTimestamp > UNLOCK_TIMEOUT_MS;
    setIsLocked(expired);
  }, [isAuthenticated, lastUnlockedAt]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (!refreshToken || !deviceId) {
      void routeToActivation();
    }
  }, [deviceId, isAuthenticated, refreshToken, routeToActivation]);

  const handleRefreshFailure = useCallback(
    async (error: AxiosError<ApiErrorResponse>) => {
      const status = error.response?.status;
      if (status === 401 || status === 423) {
        await routeToActivation();
        return;
      }

      const fallback =
        error.response?.data?.error?.message ?? 'Unable to refresh your session.';
      if (mountedRef.current) {
        setRefreshError(fallback);
      }
    },
    [routeToActivation],
  );

  const refreshTokens = useCallback(async () => {
    if (!isAuthenticated || !refreshToken || !deviceId || isLocked) {
      return;
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const promise = (async () => {
      if (mountedRef.current) {
        setIsRefreshing(true);
        setRefreshError(null);
      }

      try {
        const response = await refreshSession({ refreshToken, deviceId });
        setTokens({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken ?? refreshToken,
          deviceId: response.deviceId ?? deviceId,
        });
      } catch (error) {
        await handleRefreshFailure(error as AxiosError<ApiErrorResponse>);
      } finally {
        refreshPromiseRef.current = null;
        if (mountedRef.current) {
          setIsRefreshing(false);
        }
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, [
    deviceId,
    handleRefreshFailure,
    isAuthenticated,
    isLocked,
    refreshToken,
    setTokens,
  ]);

  useEffect(() => {
    if (!isAuthenticated || isLocked) {
      return;
    }

    void refreshTokens();
  }, [isAuthenticated, isLocked, refreshTokens]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        prevState.match(/inactive|background/) &&
        nextState === 'active' &&
        isAuthenticated
      ) {
        const now = Date.now();
        const backgroundDuration = backgroundedAtRef.current
          ? now - backgroundedAtRef.current
          : 0;
        backgroundedAtRef.current = null;

        const needsUnlock =
          backgroundDuration > UNLOCK_TIMEOUT_MS ||
          !lastUnlockedAt ||
          now - lastUnlockedAt.getTime() > UNLOCK_TIMEOUT_MS;

        if (needsUnlock) {
          setIsLocked(true);
          return;
        }

        void refreshTokens();
      }

      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAtRef.current = Date.now();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, lastUnlockedAt, refreshTokens]);

  const finalizeUnlock = useCallback(
    (method: ActivationMethod) => {
      setUnlockStatus('idle');
      setUnlockError(null);
      setPinError(null);
      setPinValue('');
      setUnlockMode(method);
      setLastUnlockedAt(new Date());
      setIsLocked(false);
      setRefreshError(null);
      void refreshTokens();
    },
    [refreshTokens, setLastUnlockedAt],
  );

  useEffect(() => {
    if (!isLocked || !canUseBiometric || unlockMode !== 'biometric') {
      return;
    }

    let canceled = false;

    const prompt = async () => {
      setUnlockStatus('verifying');
      setUnlockError(null);

      const result = await promptBiometricAuth(`Unlock with ${biometricLabel}`);
      if (canceled) {
        return;
      }

      if (result.success) {
        finalizeUnlock('biometric');
        return;
      }

      setUnlockStatus('idle');
      if (result.error === 'user_cancel') {
        setUnlockMode('pin');
        return;
      }

      setUnlockMode('pin');
      setUnlockError('Biometrics unavailable. Use your PIN instead.');
    };

    void prompt();

    return () => {
      canceled = true;
    };
  }, [biometricLabel, canUseBiometric, finalizeUnlock, isLocked, unlockMode]);

  const handlePinSubmit = useCallback(async () => {
    if (pinValue.length < PIN_LENGTH) {
      setPinError('Enter your 6-digit PIN.');
      return;
    }

    setUnlockStatus('verifying');
    setPinError(null);
    setUnlockError(null);

    try {
      const isValid = await verifyOfflinePin(pinValue);
      if (isValid) {
        finalizeUnlock('pin');
        return;
      }

      setPinValue('');
      setPinError('Incorrect PIN. Try again.');
      setUnlockStatus('idle');
    } catch {
      setUnlockStatus('idle');
      setPinError('We could not verify your PIN. Try again.');
    }
  }, [finalizeUnlock, pinValue]);

  const showUnlockModal = isAuthenticated && isLocked;
  const showBlockingLoader = !isAuthenticated;

  return (
    <View style={styles.container}>
      {children}

      {showBlockingLoader && (
        <BlockingOverlay message="Preparing your secure session…" theme={theme} />
      )}

      {isRefreshing && !isLocked && (
        <BlockingOverlay message="Refreshing your session…" theme={theme} />
      )}

      {showUnlockModal && (
        <Modal transparent animationType="fade" statusBarTranslucent>
          <View
            style={[
              styles.modalBackdrop,
              { backgroundColor: `${theme.tokens.colors.overlays.scrim}99` },
            ]}
          >
            <View
              style={[
                styles.modalCard,
                { backgroundColor: theme.tokens.colors.functional.surface.primary },
              ]}
            >
              <Typography
                variant="title"
                weight={theme.tokens.typography.weights.semibold}
                style={styles.modalTitle}
              >
                Unlock BerthCare
              </Typography>

              <Typography color={theme.tokens.colors.functional.text.secondary}>
                {unlockMode === 'pin'
                  ? 'Enter your caregiver PIN to keep patient data protected.'
                  : `Confirm ${biometricLabel} to continue caring for your clients.`}
              </Typography>

              {unlockMode === 'pin' && (
                <View style={styles.pinStack}>
                  <Input
                    label="6-digit PIN"
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={PIN_LENGTH}
                    value={pinValue}
                    onChangeText={(value) => {
                      setPinValue(sanitizePin(value));
                      setPinError(null);
                    }}
                    helperText={pinError ?? 'We keep this PIN on-device for offline access.'}
                    validationState={pinError ? 'error' : 'default'}
                  />

                  <Button onPress={handlePinSubmit} loading={unlockStatus === 'verifying'}>
                    Unlock
                  </Button>
                </View>
              )}

              {unlockMode === 'biometric' && (
                <View style={styles.biometricStack}>
                  {isCheckingBiometrics || unlockStatus === 'verifying' ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : null}
                  <Typography color={theme.tokens.colors.functional.text.secondary}>
                    {isCheckingBiometrics
                      ? 'Checking biometric enrollment…'
                      : `Waiting for ${biometricLabel}…`}
                  </Typography>
                </View>
              )}

              {unlockError && (
                <Typography
                  color={theme.tokens.colors.functional.text.error}
                  style={styles.feedback}
                >
                  {unlockError}
                </Typography>
              )}

              {refreshError && (
                <Typography
                  color={theme.tokens.colors.functional.text.warning}
                  style={styles.feedback}
                >
                  {refreshError}
                </Typography>
              )}

              {unlockMode === 'pin' && canUseBiometric && (
                <Button
                  variant="link"
                  onPress={() => {
                    setUnlockMode('biometric');
                    setUnlockError(null);
                  }}
                >
                  Use {biometricLabel} instead
                </Button>
              )}

              {unlockMode === 'biometric' && (
                <Button
                  variant="link"
                  onPress={() => {
                    setUnlockMode('pin');
                    setUnlockError(null);
                    setUnlockStatus('idle');
                  }}
                >
                  Use PIN instead
                </Button>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

type BlockingOverlayProps = {
  message: string;
  theme: BerthcareTheme;
};

const BlockingOverlay = ({ message, theme }: BlockingOverlayProps) => (
  <View
    style={[
      styles.loaderOverlay,
      { backgroundColor: `${theme.tokens.colors.overlays.scrim}66` },
    ]}
  >
    <View
      style={[
        styles.loaderContent,
        { backgroundColor: theme.tokens.colors.functional.surface.primary },
      ]}
    >
      <ActivityIndicator color={theme.colors.primary} size="large" />
      <Typography
        color={theme.tokens.colors.functional.text.primary}
        weight={theme.tokens.typography.weights.semibold}
        style={styles.loaderMessage}
      >
        {message}
      </Typography>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  modalTitle: {
    textAlign: 'center',
  },
  pinStack: {
    marginTop: 4,
    gap: 12,
  },
  biometricStack: {
    marginTop: 12,
    gap: 12,
    alignItems: 'center',
  },
  feedback: {
    textAlign: 'center',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContent: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  loaderMessage: {
    textAlign: 'center',
  },
});
