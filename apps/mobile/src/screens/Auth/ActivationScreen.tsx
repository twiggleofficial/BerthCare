import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { Button, Input, Typography, useReducedMotion } from '../../components';
import type { BerthcareTheme } from '../../design-system';
import { APP_VERSION } from '../../config/app';
import type { ActivationResponse } from '../../services/auth/activation';
import { requestActivation } from '../../services/auth/activation';
import { getDeviceFingerprint } from '../../services/device/fingerprint';
import { trackAnalyticsEvent } from '../../services/analytics';
import { useAppStore } from '../../store';

// Activation experience follows Authentication & Onboarding Design - Activation Flow
// (design-documentation/features/authentication-onboarding).
const CODE_LENGTH = 8;
// Allow a small buffer for pasted separators (e.g., "1234-5678")
const CODE_INPUT_BUFFER = 2;
const SUPPORT_EMAIL = 'care@berthcare.ca';

type ActivationScreenProps = {
  initialEmail?: string;
  onActivationComplete?: () => void;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

export const ActivationScreen = ({
  initialEmail,
  onActivationComplete,
}: ActivationScreenProps) => {
  const theme = useTheme<BerthcareTheme>();
  const { spacing, colors } = theme.tokens;
  const [email, setEmail] = useState(initialEmail ?? '');
  const [code, setCode] = useState('');
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    'Enter the 8-digit code from your care coordinator.',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [lastAutoSubmittedCode, setLastAutoSubmittedCode] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const codeChangeHapticRef = useRef(0);
  const attemptRef = useRef(0);
  const lastSubmittedDomainRef = useRef<string | null>(null);
  const requestStartRef = useRef<number | null>(null);
  const setTokens = useAppStore((state) => state.setTokens);
  const setUser = useAppStore((state) => state.setUser);

  const sanitizedCode = useMemo(
    () => code.replace(/\D/g, '').slice(0, CODE_LENGTH),
    [code],
  );

  useEffect(() => {
    let isMounted = true;
    void getDeviceFingerprint().then((fingerprint) => {
      if (isMounted) {
        setDeviceFingerprint(fingerprint);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    void trackAnalyticsEvent({
      name: 'activation_screen_view',
      properties: { emailPrefilled: Boolean(initialEmail) },
    });
  }, [initialEmail]);

  const appVersion = APP_VERSION;
  const emailIsValid = useMemo(() => {
    if (!email.trim()) {
      return false;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const canSubmit =
    sanitizedCode.length === CODE_LENGTH && Boolean(deviceFingerprint) && emailIsValid;

  const formatCodeForRequest = useCallback(
    () => `${sanitizedCode.slice(0, 4)}-${sanitizedCode.slice(4, CODE_LENGTH)}`,
    [sanitizedCode],
  );

  const triggerErrorShake = useCallback(() => {
    if (prefersReducedMotion) {
      return;
    }

    shakeAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: -6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -4,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [prefersReducedMotion, shakeAnimation]);

  const activationMutation = useMutation({
    mutationFn: requestActivation,
    onSuccess: async (response: ActivationResponse) => {
      const startedAt = requestStartRef.current;
      requestStartRef.current = null;
      const durationMs = typeof startedAt === 'number' ? Date.now() - startedAt : undefined;

      await setTokens({
        activationToken: response.activationToken,
        accessToken: null,
        refreshToken: null,
      });
      setUser(response.user);
      setStatusMessage('Code accepted. Secure your device with a PIN next.');
      setErrorMessage(null);
      setRateLimitMessage(null);
      void trackAnalyticsEvent({
        name: 'activation_success',
        properties: {
          attempts: attemptRef.current,
          durationMs,
        },
      });
      onActivationComplete?.();
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const errorCode = error.response?.data?.error?.code ?? 'SERVER_UNKNOWN_ERROR';
      const message =
        resolveActivationErrorMessage(errorCode, error.response?.data?.error?.message) ??
        'We could not verify that code.';
      setErrorMessage(message);
      setStatusMessage(null);
      setRateLimitMessage(
        errorCode === 'AUTH_ACTIVATION_RATE_LIMITED'
          ? 'Too many attempts. Please wait a few minutes before trying again.'
          : null,
      );
      triggerErrorShake();
      requestStartRef.current = null;
      void trackAnalyticsEvent({
        name: 'activation_error',
        properties: {
          code: errorCode,
          attempts: attemptRef.current,
          emailDomain: lastSubmittedDomainRef.current,
        },
      });
    },
  });

  const handleCodeChange = useCallback(
    (nextValue: string) => {
      const nextSanitized = nextValue.replace(/\D/g, '').slice(0, CODE_LENGTH);
      if (activationMutation.isPending || nextSanitized === sanitizedCode) {
        return;
      }

      if (nextSanitized.length < CODE_LENGTH) {
        setLastAutoSubmittedCode(null);
      }
      setCode(nextSanitized);
      setErrorMessage(null);
      setRateLimitMessage(null);

      if (nextSanitized.length > codeChangeHapticRef.current) {
        Vibration.vibrate(5);
      }
      codeChangeHapticRef.current = nextSanitized.length;
    },
    [activationMutation.isPending, sanitizedCode],
  );

  const emailDomain = useMemo(() => {
    const domain = email.trim().split('@')[1];
    return domain?.toLowerCase() ?? null;
  }, [email]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || activationMutation.isPending || !deviceFingerprint) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const formattedCode = formatCodeForRequest();
    const nextAttempt = attemptRef.current + 1;
    attemptRef.current = nextAttempt;
    lastSubmittedDomainRef.current = emailDomain;
    setStatusMessage('Checking activation code…');
    setErrorMessage(null);
    setRateLimitMessage(null);
    requestStartRef.current = Date.now();
    Keyboard.dismiss();

    void trackAnalyticsEvent({
      name: 'activation_code_submit',
      properties: {
        attempt: nextAttempt,
        emailDomain,
      },
    });

    activationMutation.mutate({
      email: normalizedEmail,
      activationCode: formattedCode,
      deviceFingerprint,
      appVersion,
    });
  }, [
    activationMutation,
    appVersion,
    canSubmit,
    deviceFingerprint,
    email,
    emailDomain,
    formatCodeForRequest,
  ]);

  useEffect(() => {
    if (
      sanitizedCode.length === CODE_LENGTH &&
      sanitizedCode !== lastAutoSubmittedCode &&
      canSubmit &&
      !activationMutation.isPending
    ) {
      setLastAutoSubmittedCode(sanitizedCode);
      handleSubmit();
    }
  }, [
    activationMutation.isPending,
    canSubmit,
    handleSubmit,
    lastAutoSubmittedCode,
    sanitizedCode,
  ]);

  const handleSupportPress = useCallback(() => {
    const subject = encodeURIComponent('Activation support');
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
  }, []);

  const containerStyle = useMemo(
    () => ({
      paddingHorizontal: spacing.scale.lg,
      paddingVertical: spacing.scale.xl,
      gap: spacing.scale.lg,
    }),
    [spacing.scale.lg, spacing.scale.xl],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.foundation.trust[50] }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.container, containerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Typography variant="title">Welcome</Typography>
            <Typography color={colors.functional.text.secondary}>
              Finish activation in under a minute so you can get back to care.
            </Typography>
          </View>

          {initialEmail ? (
            <View
              style={[
                styles.summaryCard,
                {
                  borderColor: colors.functional.border.subtle,
                  backgroundColor: colors.functional.surface.primary,
                },
              ]}
            >
              <Typography variant="small" color={colors.functional.text.secondary}>
                BerthCare ID
              </Typography>
              <Typography variant="heading">{email}</Typography>
            </View>
          ) : (
            <Input
              label="Work email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={(next) => {
                setEmail(next);
              }}
              helperText={
                !emailIsValid && email.length > 0 ? 'Enter a valid work email' : undefined
              }
            />
          )}

          <View>
            <Typography
              variant="small"
              color={colors.functional.text.secondary}
              style={styles.helperLabel}
            >
              Activation code
            </Typography>
            <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
              <ActivationCodeInput
                value={sanitizedCode}
                disabled={activationMutation.isPending}
                hasError={Boolean(errorMessage)}
                autoFocus={Boolean(initialEmail)}
                onChange={handleCodeChange}
              />
            </Animated.View>
            <Typography
              variant="caption"
              color={colors.functional.text.secondary}
              style={styles.helperText}
            >
              Code shared by your care coordinator.
            </Typography>
          </View>

          {(errorMessage || statusMessage || rateLimitMessage) && (
            <View style={styles.feedbackStack}>
              {errorMessage && (
                <Typography color={colors.functional.text.error}>{errorMessage}</Typography>
              )}
              {rateLimitMessage && (
                <Typography color={colors.functional.text.warning}>
                  {rateLimitMessage}
                </Typography>
              )}
              {statusMessage && !errorMessage && (
                <Typography color={colors.functional.text.secondary}>
                  {statusMessage}
                </Typography>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <Button
              onPress={handleSubmit}
              disabled={!canSubmit || activationMutation.isPending}
              loading={activationMutation.isPending}
            >
              Continue
            </Button>
            <Button variant="link" onPress={handleSupportPress}>
              Need help? Contact support
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const resolveActivationErrorMessage = (code: string, fallback?: string | null) => {
  switch (code) {
    case 'AUTH_INVALID_ACTIVATION_CODE':
      return "That code doesn't match. Double-check the 8 digits.";
    case 'AUTH_ACTIVATION_EXPIRED':
      return 'This code expired. Ask your coordinator for a new one.';
    case 'AUTH_ACTIVATION_RATE_LIMITED':
      return 'Too many attempts right now.';
    default:
      return fallback ?? 'We could not verify that code. Please try again.';
  }
};

type ActivationCodeInputProps = {
  value: string;
  hasError?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
};

const ActivationCodeInput = ({
  value,
  hasError,
  disabled,
  autoFocus = false,
  onChange,
}: ActivationCodeInputProps) => {
  const theme = useTheme<BerthcareTheme>();
  const { colors, spacing, typography } = theme.tokens;
  const [isFocused, setIsFocused] = useState(false);
  const [codeContainerWidth, setCodeContainerWidth] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const digits = useMemo(
    () => value.padEnd(CODE_LENGTH).split('').slice(0, CODE_LENGTH),
    [value],
  );
  const digitGroups = useMemo(
    () => [digits.slice(0, 4), digits.slice(4, CODE_LENGTH)],
    [digits],
  );

  const borderColor = hasError
    ? colors.functional.border.error
    : isFocused
      ? colors.functional.border.focus
      : colors.functional.border.default;

  const digitGap = spacing.scale['2xs'];
  const hyphenWidth = spacing.scale.sm;
  const hyphenSpacing = digitGap * 2;
  const horizontalPadding = spacing.scale.md * 2;
  const availableWidth = Math.max(
    codeContainerWidth - horizontalPadding - hyphenWidth - hyphenSpacing - digitGap * (CODE_LENGTH - 2),
    0,
  );
  const digitWidth =
    codeContainerWidth === 0
      ? spacing.scale['2xl']
      : Math.max(
          spacing.scale.sm,
          Math.min(availableWidth / CODE_LENGTH, spacing.scale['2xl']),
        );

  const handlePress = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        accessibilityLabel="Activation code"
        accessibilityHint="Enter the 8-digit activation code"
        onLayout={(event) => {
          setCodeContainerWidth(event.nativeEvent.layout.width);
        }}
        style={[
          styles.codeContainer,
          {
            borderColor,
            paddingVertical: spacing.scale.sm,
            paddingHorizontal: spacing.scale.md,
            backgroundColor: colors.functional.surface.primary,
          },
        ]}
      >
        <View style={styles.codeRow}>
          <View
            style={styles.digitGroup}
          >
            {digitGroups[0].map((digit, index) => (
              <View
                key={`digit-0-${index}`}
                style={[
                  styles.digitBox,
                  {
                    borderColor,
                    width: digitWidth,
                    marginRight: index < digitGroups[0].length - 1 ? digitGap : 0,
                  },
                ]}
              >
                <Typography
                  variant="heading"
                  weight={typography.weights.semibold}
                  color={
                    digit.trim()
                      ? colors.functional.text.primary
                      : colors.functional.text.secondary
                  }
                >
                  {digit.trim() || '-'}
                </Typography>
              </View>
            ))}
          </View>
          <View
            style={[
              styles.hyphen,
              {
                width: hyphenWidth,
                marginHorizontal: digitGap,
              },
            ]}
          >
            <Typography variant="heading" color={colors.functional.text.secondary}>
              -
            </Typography>
          </View>
          <View
            style={styles.digitGroup}
          >
            {digitGroups[1].map((digit, index) => (
              <View
                key={`digit-1-${index}`}
                style={[
                  styles.digitBox,
                  {
                    borderColor,
                    width: digitWidth,
                    marginRight: index < digitGroups[1].length - 1 ? digitGap : 0,
                  },
                ]}
              >
                <Typography
                  variant="heading"
                  weight={typography.weights.semibold}
                  color={
                    digit.trim()
                      ? colors.functional.text.primary
                      : colors.functional.text.secondary
                  }
                >
                  {digit.trim() || '-'}
                </Typography>
              </View>
            ))}
          </View>
        </View>
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH + CODE_INPUT_BUFFER}
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        importantForAutofill="yes"
        autoCorrect={false}
        accessibilityLabel="Activation code"
        caretHidden
        style={styles.hiddenInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        editable={!disabled}
      />
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    gap: 8,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  helperLabel: {
    marginBottom: 8,
  },
  helperText: {
    marginTop: 8,
  },
  codeContainer: {
    borderWidth: 2,
    borderRadius: 16,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hyphen: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBox: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    flexShrink: 1,
  },
  feedbackStack: {
    gap: 4,
  },
  actions: {
    gap: 8,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
});

export default ActivationScreen;
