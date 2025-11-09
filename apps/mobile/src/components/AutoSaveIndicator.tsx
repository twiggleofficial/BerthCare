import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

import type { AutoSaveStatus } from '../hooks/useAutoSave';
import type { BerthcareTheme } from '../design-system';
import { Typography } from './Typography';

type AutoSaveIndicatorProps = {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  isDirty: boolean;
};

type IndicatorCopy = {
  title: string;
  detail: string | null;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const RELATIVE_MINUTE = 60_000;
const RELATIVE_HOUR = 3_600_000;

const formatRelativeTime = (timestamp: Date): string => {
  const delta = Date.now() - timestamp.getTime();
  if (delta < 5_000) {
    return 'just now';
  }
  if (delta < RELATIVE_MINUTE) {
    return `${Math.max(1, Math.round(delta / 1000))}s ago`;
  }
  if (delta < RELATIVE_HOUR) {
    return `${Math.max(1, Math.round(delta / RELATIVE_MINUTE))}m ago`;
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(timestamp);
  } catch {
    return timestamp.toLocaleTimeString();
  }
};

export function AutoSaveIndicator({ status, lastSavedAt, isDirty }: AutoSaveIndicatorProps) {
  const theme = useTheme<BerthcareTheme>();
  const { colors, spacing } = theme.tokens;

  const palette = useMemo(
    () => ({
      idle: {
        backgroundColor: colors.semantic.complete[50],
        borderColor: colors.semantic.complete[200],
        textColor: colors.semantic.complete[700],
        icon: 'check-circle-outline' as const,
      },
      pending: {
        backgroundColor: colors.foundation.trust[50],
        borderColor: colors.foundation.trust[200],
        textColor: colors.foundation.trust[700],
        icon: 'clock-outline' as const,
      },
      saving: {
        backgroundColor: colors.foundation.trust[50],
        borderColor: colors.foundation.trust[200],
        textColor: colors.foundation.trust[700],
        icon: 'progress-clock' as const,
      },
      error: {
        backgroundColor: colors.semantic.urgent[50],
        borderColor: colors.semantic.urgent[200],
        textColor: colors.semantic.urgent[700],
        icon: 'alert-circle-outline' as const,
      },
    }),
    [colors],
  );

  const descriptor: IndicatorCopy = useMemo(() => {
    if (status === 'saving') {
      return {
        title: 'Saving offline…',
        detail: 'Sync runs in the background.',
        ...palette.saving,
      };
    }

    if (status === 'pending') {
      return {
        title: 'Queued to save',
        detail: 'Auto-saving in under a second.',
        ...palette.pending,
      };
    }

    if (status === 'error') {
      return {
        title: 'Save failed',
        detail: 'Retrying automatically once stable.',
        ...palette.error,
      };
    }

    if (lastSavedAt) {
      return {
        title: 'Saved',
        detail: `Updated ${formatRelativeTime(lastSavedAt)}`,
        ...palette.idle,
      };
    }

    if (isDirty) {
      return {
        title: 'Capturing changes',
        detail: 'Hold tight—auto-save is ready.',
        ...palette.pending,
      };
    }

    return {
      title: 'Auto-save is standing by',
      detail: 'Document freely—no save button needed.',
      ...palette.idle,
    };
  }, [status, lastSavedAt, isDirty, palette]);

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.container,
        {
          borderColor: descriptor.borderColor,
          backgroundColor: descriptor.backgroundColor,
          paddingVertical: spacing.scale.xs,
          paddingHorizontal: spacing.scale.sm,
        },
      ]}
    >
      <MaterialCommunityIcons
        style={styles.icon}
        name={descriptor.icon}
        size={20}
        color={descriptor.textColor}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.textGroup}>
        <Typography variant="small" weight="600" color={descriptor.textColor}>
          {descriptor.title}
        </Typography>
        {descriptor.detail && (
          <Typography variant="caption" color={descriptor.textColor}>
            {descriptor.detail}
          </Typography>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    gap: 8,
  },
  icon: {
    marginTop: 2,
  },
  textGroup: {
    flexShrink: 1,
  },
});
