import { useCallback, useMemo, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { SplashScreen, Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import {
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';

import { DatabaseProvider, database } from '../src/database';
import { theme as berthcareTheme, type BerthcareTheme } from '../src/design-system';
import { createQueryClient } from '../src/services/api';
import { NetworkListener, OfflineBanner, SyncManager } from '../src/components';
import { recordAppLaunchReady } from '../src/services/performance/launch-metrics';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [client] = useState(createQueryClient);
  const [isAppReady] = useState(true);
  const hasHiddenSplashScreen = useRef(false);

  const paperTheme: BerthcareTheme = berthcareTheme;
  const navigationTheme = useMemo<NavigationTheme>(
    () => ({
      ...NavigationDefaultTheme,
      colors: {
        ...NavigationDefaultTheme.colors,
        primary: paperTheme.colors.primary,
        background: paperTheme.colors.background,
        card: paperTheme.colors.surface,
        text: paperTheme.colors.onSurface,
        border: paperTheme.colors.outline,
      },
    }),
    [paperTheme],
  );

  const handleRootLayout = useCallback(async () => {
    if (!isAppReady || hasHiddenSplashScreen.current) {
      return;
    }

    hasHiddenSplashScreen.current = true;
    try {
      await SplashScreen.hideAsync();
      await recordAppLaunchReady();
    } catch (error) {
      console.warn('[RootLayout] Failed to finalize app launch', error);
    }
  }, [isAppReady]);

  return (
    <GestureHandlerRootView style={$root} onLayout={handleRootLayout}>
      <SafeAreaProvider>
        <DatabaseProvider database={database}>
          <NetworkListener />
          <SyncManager />
          <QueryClientProvider client={client}>
            <PaperProvider theme={paperTheme}>
              <OfflineBanner />
              <ThemeProvider value={navigationTheme}>
                <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
              </ThemeProvider>
            </PaperProvider>
          </QueryClientProvider>
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const $root: ViewStyle = { flex: 1 };
