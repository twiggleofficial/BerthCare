import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import type { BerthcareTheme } from '../design-system';
import { SyncStatusBadge } from './SyncStatusBadge';

type ViewProps = ComponentProps<typeof View>;

type AppHeaderProps = ViewProps & {
  title: string;
  subtitle?: string;
};

export function AppHeader({
  title,
  subtitle,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessible,
  ...rest
}: AppHeaderProps) {
  const theme = useTheme<BerthcareTheme>();
  const label = accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title);
  const headerRole = accessibilityRole ?? 'header';
  const containerAccessible = accessible ?? false;

  return (
    <View
      accessible={containerAccessible}
      {...rest}
      style={[
        styles.container,
        { borderBottomColor: theme.colors.outlineVariant },
        style,
      ]}
    >
      <View style={styles.copy}>
        <Text
          variant="headlineSmall"
          style={styles.title}
          accessibilityRole={headerRole}
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant="bodyMedium"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <SyncStatusBadge />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    paddingRight: 8,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
  },
});
