import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import type { BerthcareTheme } from '../design-system';
import { useAppStore } from '../store';

type BadgeDescriptor = {
  label: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const clampPending = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
};

/**
 * Sync indicator derived from `project-documentation/architecture-output.md`
 * (Sync Status Indicator) so the offline-first experience stays visible yet effortless.
 */
export function SyncStatusBadge() {
  const { syncStatus, pendingChanges, isOnline } = useAppStore((state) => ({
    syncStatus: state.syncStatus,
    pendingChanges: state.pendingChanges,
    isOnline: state.isOnline,
  }));
  const theme = useTheme<BerthcareTheme>();
  const descriptor = useMemo<BadgeDescriptor>(() => {
    const {
      semantic,
      foundation,
      functional: { border },
    } = theme.tokens.colors;
    const palette = {
      synced: {
        backgroundColor: semantic.complete[50],
        borderColor: semantic.complete[200],
        textColor: semantic.complete[700],
        label: 'Synced',
      },
      syncing: {
        backgroundColor: foundation.trust[50],
        borderColor: foundation.trust[200],
        textColor: foundation.trust[700],
        label: 'Syncing...',
      },
      offline: {
        backgroundColor: semantic.attention[50],
        borderColor: semantic.attention[200],
        textColor: semantic.attention[700],
        label: `Offline - ${clampPending(pendingChanges)} pending`,
      },
      error: {
        backgroundColor: semantic.urgent[50],
        borderColor: semantic.urgent[200],
        textColor: semantic.urgent[700],
        label: 'Sync Error',
      },
    };

    if (!isOnline) {
      return palette.offline;
    }

    if (syncStatus === 'error') {
      return palette.error;
    }

    if (syncStatus === 'syncing') {
      return palette.syncing;
    }

    return {
      ...palette.synced,
      borderColor: border.subtle,
    };
  }, [isOnline, pendingChanges, syncStatus, theme.tokens.colors]);

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.container,
        {
          backgroundColor: descriptor.backgroundColor,
          borderColor: descriptor.borderColor,
        },
      ]}
    >
      <Text variant="labelSmall" style={[styles.label, { color: descriptor.textColor }]}>
        {descriptor.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  label: {
    fontWeight: '600',
  },
});
