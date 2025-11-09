import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'face' | 'fingerprint' | 'iris';

export type BiometricSupport = {
  available: boolean;
  enrolled: boolean;
  primaryType: BiometricType | null;
  types: LocalAuthentication.AuthenticationType[];
};

const resolvePrimaryType = (
  types: LocalAuthentication.AuthenticationType[],
): BiometricType | null => {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'face';
  }

  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }

  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }

  return null;
};

export const checkBiometricSupport = async (): Promise<BiometricSupport> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { available: false, enrolled: false, primaryType: null, types: [] };
    }

    const [isEnrolled, supportedTypes] = await Promise.all([
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    if (supportedTypes.length === 0) {
      return { available: false, enrolled: false, primaryType: null, types: [] };
    }

    return {
      available: true,
      enrolled: isEnrolled,
      primaryType: resolvePrimaryType(supportedTypes),
      types: supportedTypes,
    };
  } catch {
    return { available: false, enrolled: false, primaryType: null, types: [] };
  }
};

export const promptBiometricAuth = async (promptMessage: string) => {
  return LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Use PIN',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
};
