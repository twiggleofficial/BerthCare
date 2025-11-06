import React from 'react';
import { SafeAreaView, Text } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { projectMetadata } from '@berthcare/shared';
import { bootstrapMonitoring } from './monitoring';

const initializeMonitoring: () => void = bootstrapMonitoring;

const AppView: React.FC = () => {
  React.useEffect(() => {
    try {
      initializeMonitoring();
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
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
