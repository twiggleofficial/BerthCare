import type { ComponentType, FC } from 'react';
import { Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';

let initialized = false;

const parseSampleRate = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseFloat(value ?? '');
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    return fallback;
  }

  return parsed;
};

export const bootstrapMonitoring = (): void => {
  if (initialized) {
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN_MOBILE ?? process.env.SENTRY_DSN_MOBILE;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: parseSampleRate(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),
    enableAutoSessionTracking: true,
    enableNative: true,
    debug: __DEV__,
  });

  initialized = true;
};

const getDisplayName = (Component: ComponentType): string => {
  return Component.displayName ?? Component.name ?? 'Component';
};

export const withMonitoring = <P extends object>(Component: ComponentType<P>): ComponentType<P> => {
  bootstrapMonitoring();

  const ErrorFallback: FC = () => (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          textAlign: 'center',
        }}
      >
        Something went wrong. Please try again later.
      </Text>
    </View>
  );

  const Wrapped: FC<P> = (props) => {
    return (
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        <Component {...props} />
      </Sentry.ErrorBoundary>
    );
  };

  Wrapped.displayName = `WithMonitoring(${getDisplayName(Component)})`;

  return Wrapped;
};

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
