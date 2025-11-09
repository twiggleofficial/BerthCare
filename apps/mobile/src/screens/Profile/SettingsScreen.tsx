import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, View } from 'react-native';
import { Button, Switch, Text } from 'react-native-paper';
import { useCallback, useEffect, useState } from 'react';

import type { ProfileStackScreenProps } from '../../navigation/types';

type SettingsProps = ProfileStackScreenProps<'Settings'>;

const OFFLINE_SYNC_KEY = 'settings.offlineSync';
const QUIET_NOTIFICATIONS_KEY = 'settings.notifications';
const DEFAULT_OFFLINE_SYNC = true;
const DEFAULT_QUIET_NOTIFICATIONS = true;

const parseStoredBoolean = (value: string | null, fallback: boolean) => {
  if (value === null) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'boolean' ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export function SettingsScreen({ navigation }: SettingsProps) {
  const [offlineSync, setOfflineSync] = useState(DEFAULT_OFFLINE_SYNC);
  const [quietNotifications, setQuietNotifications] = useState(
    DEFAULT_QUIET_NOTIFICATIONS,
  );

  useEffect(() => {
    let isActive = true;

    const loadPreferences = async () => {
      try {
        const results = await AsyncStorage.multiGet([
          OFFLINE_SYNC_KEY,
          QUIET_NOTIFICATIONS_KEY,
        ]);

        if (!isActive) {
          return;
        }

        const offlineSyncValue = results.find(
          ([key]) => key === OFFLINE_SYNC_KEY,
        )?.[1];
        const notificationsValue = results.find(
          ([key]) => key === QUIET_NOTIFICATIONS_KEY,
        )?.[1];

        setOfflineSync(
          parseStoredBoolean(offlineSyncValue ?? null, DEFAULT_OFFLINE_SYNC),
        );
        setQuietNotifications(
          parseStoredBoolean(
            notificationsValue ?? null,
            DEFAULT_QUIET_NOTIFICATIONS,
          ),
        );
      } catch (error) {
        console.warn('Failed to load settings', error);
      }
    };

    loadPreferences();

    return () => {
      isActive = false;
    };
  }, []);

  const persistSetting = useCallback(async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save setting for ${key}`, error);
    }
  }, []);

  const handleToggleOfflineSync = useCallback(
    (value: boolean) => {
      setOfflineSync(value);
      void persistSetting(OFFLINE_SYNC_KEY, value);
    },
    [persistSetting],
  );

  const handleToggleNotifications = useCallback(
    (value: boolean) => {
      setQuietNotifications(value);
      void persistSetting(QUIET_NOTIFICATIONS_KEY, value);
    },
    [persistSetting],
  );

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Care settings</Text>
      <View style={styles.row}>
        <Text variant="bodyLarge">Offline sync</Text>
        <Switch
          value={offlineSync}
          onValueChange={handleToggleOfflineSync}
          accessibilityLabel="Offline sync switch"
          accessibilityRole="switch"
        />
      </View>
      <View style={styles.row}>
        <Text variant="bodyLarge">Quiet notifications</Text>
        <Switch
          value={quietNotifications}
          onValueChange={handleToggleNotifications}
          accessibilityLabel="Quiet notifications switch"
          accessibilityRole="switch"
        />
      </View>
      <Button
        mode="contained"
        icon="arrow-left"
        onPress={() => navigation.goBack()}
      >
        Back to profile
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
