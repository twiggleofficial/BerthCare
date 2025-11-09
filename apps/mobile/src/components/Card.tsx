import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from 'react-native-paper';

import type { BerthcareTheme } from '../design-system';
import { Typography } from './Typography';
import { useReducedMotion } from './use-reduced-motion';

type CardStatus = 'upcoming' | 'inProgress' | 'complete' | 'overdue' | 'cancelled' | 'default';

export type CardProps = {
  title?: string;
  subtitle?: string;
  meta?: string;
  status?: CardStatus;
  offline?: boolean;
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Visit-ready card per design-documentation/design-system/components/cards.md
 * and the WCAG rules captured in design-documentation/accessibility/wcag-compliance.md:
 * single 88pt surface, AA contrast, and motion-safe press feedback.
 */
export const Card = ({
  title,
  subtitle,
  meta,
  status = 'default',
  offline = false,
  onPress,
  children,
  style,
}: CardProps) => {
  const theme = useTheme<BerthcareTheme>();
  const prefersReducedMotion = useReducedMotion();
  const { colors, spacing, typography } = theme.tokens;
  const accentColor = getAccentColor(colors, status);

  const cardStyle = (pressed?: boolean) => [
    styles.base,
    {
      padding: spacing.scale.md,
      minHeight: 88,
      borderRadius: spacing.scale.xs,
      backgroundColor: colors.functional.surface.primary,
      shadowColor: colors.overlays.shadow,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 3,
      elevation: 1,
      transform:
        pressed && onPress && !prefersReducedMotion ? [{ scale: 0.98 }] : undefined,
    },
    pressed && onPress
      ? { backgroundColor: colors.neutral[100], shadowOpacity: 0.08, shadowRadius: 2 }
      : undefined,
    style,
  ];

  const content = (
    <>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />

      {offline && (
        <View
          style={[
            styles.offlineDot,
            {
              borderColor: colors.functional.surface.primary,
              backgroundColor: colors.neutral[500],
            },
          ]}
        />
      )}

      <View style={styles.header}>
        {title && (
          <Typography
            variant="heading"
            weight={typography.weights.semibold}
            style={styles.title}
          >
            {title}
          </Typography>
        )}
        {meta && (
          <Typography
            variant="small"
            color={colors.functional.text.secondary}
            style={styles.meta}
          >
            {meta}
          </Typography>
        )}
      </View>

      {subtitle && (
        <Typography variant="body" color={colors.functional.text.secondary}>
          {subtitle}
        </Typography>
      )}

      {children && <View style={styles.body}>{children}</View>}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => cardStyle(pressed)}
        android_ripple={{ color: colors.neutral[200], borderless: false }}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle()}>{content}</View>;
};

const getAccentColor = (
  colors: BerthcareTheme['tokens']['colors'],
  status: CardStatus,
) => {
  const mapping: Record<CardStatus, string> = {
    default: colors.functional.border.subtle,
    upcoming: colors.functional.visit.upcoming,
    inProgress: colors.functional.visit.inProgress,
    complete: colors.functional.visit.complete,
    overdue: colors.functional.visit.overdue,
    cancelled: colors.functional.visit.cancelled,
  };

  return mapping[status];
};

const styles = StyleSheet.create({
  base: {
    position: 'relative',
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  offlineDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  meta: {
    textAlign: 'right',
  },
  body: {
    marginTop: 8,
    gap: 4,
  },
});
