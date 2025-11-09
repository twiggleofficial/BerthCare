import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button, Input, Typography } from '../../components';
import type { BerthcareTheme } from '../../design-system';
import { completeActivation } from '../../services/auth/activation';
import { saveOfflinePin } from '../../services/auth/offline-pin';
import { checkBiometricSupport, promptBiometricAuth } from '../../services/device/biometrics';
import type { BiometricSupport } from '../../services/device/biometrics';
import { getDeviceName } from '../../services/device/info';
import { trackAnalyticsEvent } from '../../services/analytics';
import { useAppStore } from '../../store';

// Screen blueprint follows Authentication & Onboarding Design – Biometric Setup
// (design-documentation/features/authentication-onboarding/README.md).

type BiometricSetupScreenProps = {
  onEnrollmentComplete?: () => void;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

const PIN_LENGTH = 6;
const DISCOURAGED_PINS = new Set(['000000', '111111', '123456', '654321', '112233']);
type CompletionResponse = Awaited<ReturnType<typeof completeActivation>>;

const sanitizePin = (value: string) => value.replace(/\D/g, '').slice(0, PIN_LENGTH);

type CompletionErrorResult = {
  message: string;
  pinViolationMessage?: string;
};

class BiometricEnrollmentError extends Error {
  constructor(
    message: string,
    public readonly reason: 'user_cancel' | 'failed',
  ) {
    super(message);
    this.name = 'BiometricEnrollmentError';
  }
}

const resolveBiometricLabel = (support: BiometricSupport): string => {
  if (!support.available || !support.primaryType) {
    return 'biometric unlock';
  }

  if (support.primaryType === 'face') {
    return 'Face ID';
  }

  if (support.primaryType === 'fingerprint') {
    return Platform.OS === 'ios' ? 'Touch ID' : 'fingerprint unlock';
  }

  return 'iris unlock';
};

const resolveBiometricIcon = (support: BiometricSupport) => {
  if (!support.available || !support.primaryType) {
    return 'shield-key';
  }

  if (support.primaryType === 'face') {
    return 'face-recognition';
  }

  if (support.primaryType === 'iris') {
    return 'eye';
  }

  return 'fingerprint';
};

export const BiometricSetupScreen = ({ onEnrollmentComplete }: BiometricSetupScreenProps) => {
  const theme = useTheme<BerthcareTheme>();
  const { colors: tokenColors, spacing, typography } = theme.tokens;
  const [pin, setPin] = useState('');
  const [confirmedPin, setConfirmedPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [biometricSupport, setBiometricSupport] = useState<BiometricSupport>({
    available: false,
    enrolled: false,
    primaryType: null,
    types: [],
  });
  const [prefersPinOnly, setPrefersPinOnly] = useState(false);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const userSelectedModeRef = useRef(false);
  const activationToken = useAppStore((state) => state.tokens.activationToken);
  const setTokens = useAppStore((state) => state.setTokens);
  const setActivationMethod = useAppStore((state) => state.setActivationMethod);
  const setLastUnlockedAt = useAppStore((state) => state.setLastUnlockedAt);

  const completionMutation = useMutation({ mutationFn: completeActivation });

  const biometricLabel = useMemo(
    () => resolveBiometricLabel(biometricSupport),
    [biometricSupport],
  );
  const biometricIcon = useMemo(
    () => resolveBiometricIcon(biometricSupport),
    [biometricSupport],
  );
  const canUseBiometric =
    biometricSupport.available && biometricSupport.enrolled && !prefersPinOnly;

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const support = await checkBiometricSupport();
      if (!isMounted) {
        return;
      }
      setBiometricSupport(support);
      setPrefersPinOnly((current) =>
        userSelectedModeRef.current ? current : !support.available || !support.enrolled,
      );
      setIsCheckingBiometrics(false);
      void trackAnalyticsEvent({
        name: 'biometric_setup_view',
        properties: {
          available: support.available,
          enrolled: support.enrolled,
          primaryType: support.primaryType,
        },
      });
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const validatePins = useCallback(() => {
    let isValid = true;

    if (!/^\d{6}$/.test(pin)) {
      setPinError('PIN must include 6 digits.');
      isValid = false;
    } else if (DISCOURAGED_PINS.has(pin)) {
      setPinError('Choose a less predictable PIN.');
      isValid = false;
    } else {
      setPinError(null);
    }

    if (!confirmedPin) {
      setConfirmError('Confirm your PIN.');
      isValid = false;
    } else if (pin !== confirmedPin) {
      setConfirmError('PINs must match.');
      isValid = false;
    } else {
      setConfirmError(null);
    }

    return isValid;
  }, [confirmedPin, pin]);

  const handleCompletionError = useCallback(
    (error: AxiosError<ApiErrorPayload>): CompletionErrorResult => {
      const errorCode = error.response?.data?.error?.code ?? 'AUTH_ACTIVATION_FAILED';
      const fallback = error.response?.data?.error?.message;

      switch (errorCode) {
        case 'AUTH_INVALID_ACTIVATION_TOKEN':
          return {
            message: 'This activation token expired. Restart activation to continue.',
          };
        case 'AUTH_PIN_POLICY_VIOLATION': {
          const pinViolationMessage = 'That PIN is not secure enough. Try something less predictable.';
          return {
            message: pinViolationMessage,
            pinViolationMessage,
          };
        }
        default:
          return {
            message: fallback ?? 'We could not finish securing your device.',
          };
      }
    },
    [],
  );

  const validateAndPrepare = useCallback(() => {
    if (!activationToken) {
      setErrorMessage('We need a valid activation token. Restart activation to continue.');
      return null;
    }

    if (!validatePins()) {
      return null;
    }

    const supportsBiometric = canUseBiometric;
    setErrorMessage(null);
    setStatusMessage(
      supportsBiometric ? `Enabling ${biometricLabel}…` : 'Securing your PIN…',
    );

    return { supportsBiometric, activationToken };
  }, [activationToken, biometricLabel, canUseBiometric, validatePins]);

  const handleBiometricEnrollment = useCallback(async (label: string) => {
    const result = await promptBiometricAuth(`Enable ${label}`);
    if (!result.success) {
      const reason = result.error === 'user_cancel' ? 'user_cancel' : 'failed';
      throw new BiometricEnrollmentError(
        reason === 'user_cancel'
          ? 'Biometric enrollment was canceled.'
          : 'We could not verify your biometrics. Try again or use your PIN.',
        reason,
      );
    }
  }, []);

  const callCompletionApi = useCallback(
    async (
      token: string,
      pinValue: string,
      deviceName: string,
      supportsBiometric: boolean,
    ) => {
      return completionMutation.mutateAsync({
        activationToken: token,
        pin: pinValue,
        deviceName,
        supportsBiometric,
      });
    },
    [completionMutation],
  );

  const finalizeEnrollment = useCallback(
    async (response: CompletionResponse, supportsBiometric: boolean) => {
      await setTokens({
        activationToken: null,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        deviceId: response.deviceId,
      });
      setActivationMethod(supportsBiometric ? 'biometric' : 'pin');
      setLastUnlockedAt(new Date());
    },
    [setActivationMethod, setLastUnlockedAt, setTokens],
  );

  const handleSubmit = useCallback(async () => {
    const preparation = validateAndPrepare();
    if (!preparation) {
      return;
    }

    const { supportsBiometric, activationToken: token } = preparation;

    if (supportsBiometric) {
      try {
        await handleBiometricEnrollment(biometricLabel);
      } catch (error) {
        setStatusMessage(null);
        if (error instanceof BiometricEnrollmentError) {
          setErrorMessage(error.message);
          return;
        }
        console.error('Unexpected biometric enrollment error', error);
        setErrorMessage('An unexpected error occurred during biometric setup.');
        return;
      }
    }

    void trackAnalyticsEvent({
      name: 'biometric_enable_submit',
      properties: { supportsBiometric },
    });

    try {
      await saveOfflinePin(pin);
    } catch (error) {
      console.error('Failed to save offline PIN', error);
      setStatusMessage(null);
      setErrorMessage('We could not securely store your PIN. Please try again.');
      void trackAnalyticsEvent({
        name: 'biometric_offline_pin_persist_error',
        properties: { supportsBiometric },
      });
      return;
    }

    try {
      const deviceName = getDeviceName();
      const response = await callCompletionApi(token, pin, deviceName, supportsBiometric);

      await finalizeEnrollment(response, supportsBiometric);

      void trackAnalyticsEvent({
        name: 'biometric_enrollment_success',
        properties: { supportsBiometric },
      });

      onEnrollmentComplete?.();
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;
      const { message, pinViolationMessage } = handleCompletionError(axiosError);
      setErrorMessage(message);
      if (pinViolationMessage) {
        setPinError(pinViolationMessage);
      }
      void trackAnalyticsEvent({
        name: 'biometric_enrollment_error',
        properties: {
          supportsBiometric,
          code: axiosError.response?.data?.error?.code ?? 'UNKNOWN',
        },
      });
    } finally {
      setStatusMessage(null);
    }
  }, [
    biometricLabel,
    callCompletionApi,
    finalizeEnrollment,
    handleBiometricEnrollment,
    handleCompletionError,
    onEnrollmentComplete,
    pin,
    setPinError,
    validateAndPrepare,
  ]);

  const ctaLabel = canUseBiometric ? `Enable ${biometricLabel}` : 'Continue with PIN';
  const isLoading = completionMutation.isPending;
  const disableSubmit =
    isLoading ||
    !activationToken ||
    pin.length < PIN_LENGTH ||
    confirmedPin.length < PIN_LENGTH;

  const helperCopy = canUseBiometric
    ? `${biometricLabel} keeps sign-in instant. Your PIN is the offline fallback.`
    : 'Your PIN unlocks the app if biometrics are unavailable.';

  const showPinToggle =
    biometricSupport.available && biometricSupport.enrolled && !isCheckingBiometrics;
  const showBiometricSettingsHint = biometricSupport.available && !biometricSupport.enrolled;
  const showNoBiometricSupport = !biometricSupport.available && !isCheckingBiometrics;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: tokenColors.functional.surface.primary }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingVertical: spacing.scale.xl,
            paddingHorizontal: spacing.scale.lg,
            gap: spacing.scale.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: tokenColors.foundation.trust[100],
                shadowColor: tokenColors.overlays.shadow,
              },
            ]}
          >
            <MaterialCommunityIcons name={biometricIcon} size={36} color={theme.colors.primary} />
          </View>

          <Typography variant="title" weight={typography.weights.semibold}>
            Quick & Secure Access
          </Typography>
          <Typography color={tokenColors.functional.text.secondary} style={styles.centerText}>
            {canUseBiometric
              ? `Use ${biometricLabel} to sign in instantly and keep patient data secure.`
              : 'Create a PIN so you can unlock care tools even when biometrics are unavailable.'}
          </Typography>
        </View>

        {showBiometricSettingsHint && (
          <Typography color={tokenColors.functional.text.secondary}>
            Turn on {biometricLabel} in device settings to enable instant unlock later.
          </Typography>
        )}

        {showNoBiometricSupport && (
          <Typography color={tokenColors.functional.text.secondary}>
            This device does not support biometrics. We will rely on your PIN to keep access secure.
          </Typography>
        )}

        {prefersPinOnly && showPinToggle && (
          <View
            style={[
              styles.infoBanner,
              {
                borderColor: tokenColors.functional.border.subtle,
                backgroundColor: tokenColors.foundation.trust[50],
              },
            ]}
          >
            <Typography color={tokenColors.functional.text.secondary}>
              You can enable {biometricLabel} in Settings anytime. For now we will use your PIN.
            </Typography>
          </View>
        )}

        <View style={styles.form}>
          <Input
            label="Create 6-digit PIN"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
            value={pin}
            onChangeText={(value) => {
              setPin(sanitizePin(value));
              setPinError(null);
              setErrorMessage(null);
            }}
            helperText={pinError ?? helperCopy}
            validationState={pinError ? 'error' : 'default'}
          />

          <Input
            label="Confirm PIN"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
            value={confirmedPin}
            onChangeText={(value) => {
              setConfirmedPin(sanitizePin(value));
              setConfirmError(null);
              setErrorMessage(null);
            }}
            helperText={confirmError ?? 'We will ask for this PIN if biometrics fail.'}
            validationState={confirmError ? 'error' : 'default'}
          />
        </View>

        {(errorMessage || statusMessage) && (
          <View style={styles.feedbackStack}>
            {errorMessage && (
              <Typography color={tokenColors.functional.text.error}>{errorMessage}</Typography>
            )}
            {statusMessage && !errorMessage && (
              <Typography color={tokenColors.functional.text.secondary}>
                {statusMessage}
              </Typography>
            )}
          </View>
        )}

        <Button onPress={handleSubmit} disabled={disableSubmit} loading={isLoading}>
          {ctaLabel}
        </Button>

        {showPinToggle && (
          <Button
            variant="link"
            onPress={() => {
              userSelectedModeRef.current = true;
              setPrefersPinOnly((prev) => !prev);
              setErrorMessage(null);
              setStatusMessage(null);
            }}
          >
            {prefersPinOnly ? `Use ${biometricLabel} instead` : 'Use PIN instead'}
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  centerText: {
    textAlign: 'center',
  },
  infoBanner: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  form: {
    gap: 16,
  },
  feedbackStack: {
    gap: 4,
  },
});

export default BiometricSetupScreen;
