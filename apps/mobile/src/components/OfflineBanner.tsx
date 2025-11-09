import { StyleSheet, View } from 'react-native';
import { Portal, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BerthcareTheme } from '../design-system';
import { useAppStore, networkSelectors } from '../store';

import { Typography } from './Typography';

/**
 * Surface connectivity changes inline with the Offline-First cadence defined in
 * `project-documentation/architecture-output.md` so caregivers always know when
 * the app is buffering work for later sync.
 */
export function OfflineBanner() {
  const isOnline = useAppStore(networkSelectors.isOnline);
  const theme = useTheme<BerthcareTheme>();
  const insets = useSafeAreaInsets();

  if (isOnline) {
    return null;
  }

  const { spacing, colors, typography } = theme.tokens;

  return (
    <Portal>
      <View
        pointerEvents="box-none"
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.banner,
          {
            top: insets.top + spacing.scale.xs,
            marginHorizontal: spacing.scale.md,
            paddingVertical: spacing.scale.xs,
            paddingHorizontal: spacing.scale.md,
            borderRadius: spacing.scale.lg,
            backgroundColor: colors.semantic.attention[50],
            borderColor: colors.semantic.attention[200],
            shadowColor: colors.overlays.shadow,
          },
        ]}
      >
        <View
          style={[
            styles.indicator,
            {
              backgroundColor: colors.semantic.attention[500],
            },
          ]}
        />
        <View style={styles.textWrapper}>
          <Typography
            variant="small"
            weight={typography.weights.semibold}
            color={colors.semantic.attention[700]}
          >
            You&apos;re offline
          </Typography>
          <Typography style={styles.caption} variant="caption" color={colors.semantic.attention[700]}>
            Changes auto-sync once you reconnect.
          </Typography>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  textWrapper: {
    flexDirection: 'column',
  },
  caption: {
    marginTop: 2,
  },
});
