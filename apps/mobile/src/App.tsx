import React from 'react';
import { SafeAreaView, Text } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { projectMetadata } from '@berthcare/shared';
import { bootstrapMonitoring } from './monitoring';

const AppView: React.FC = () => {
  React.useEffect(() => {
    try {
      const runMonitoring: () => void = bootstrapMonitoring;
      runMonitoring();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error('Failed to initialize monitoring:', errorMessage);
    }
  }, []);

  return (
    <SafeAreaView>
      <Text>
        {projectMetadata.displayName} mobile ready – v{projectMetadata.version}
      </Text>
    </SafeAreaView>
  );
};

export const App = AppView;

const MonitoredApp: React.FC = () => {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <SafeAreaView>
          <Text>Something went wrong</Text>
        </SafeAreaView>
      }
    >
      <AppView />
    </Sentry.ErrorBoundary>
  );
};

export default MonitoredApp;
