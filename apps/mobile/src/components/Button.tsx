import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { ReactNode } from 'react';

import type { BerthcareTheme } from '../design-system';
import { Typography } from './Typography';
import { useReducedMotion } from './use-reduced-motion';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'link';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  variant?: ButtonVariant;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Buttons follow design-documentation/design-system/components/buttons.md and
 * the guidance in design-documentation/accessibility/wcag-compliance.md so
 * every state keeps a 56pt target, AA contrast, and motion-safe feedback.
 */
export const Button = ({
  children,
  icon,
  loading,
  disabled,
  variant = 'primary',
  fullWidth,
  style,
  ...pressableProps
}: ButtonProps) => {
  const theme = useTheme<BerthcareTheme>();
  const prefersReducedMotion = useReducedMotion();
  const { colors, spacing, typography } = theme.tokens;

  const shouldFillWidth = fullWidth ?? variant !== 'link';
  const isDisabled = Boolean(disabled || loading);
  const variantStyles = getVariantStyles(theme, variant, isDisabled);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled || undefined }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: spacing.touch.comfortable,
          height: spacing.touch.comfortable,
          paddingHorizontal: spacing.scale.md,
          borderRadius: 8,
          width: shouldFillWidth ? '100%' : undefined,
          transform:
            pressed && !prefersReducedMotion ? [{ scale: 0.98 }] : undefined,
        },
        variantStyles.container,
        pressed && !isDisabled && variantStyles.pressed,
        style,
      ]}
      android_ripple={
        variant === 'link'
          ? undefined
          : { color: colors.foundation.trust[50], borderless: false }
      }
      {...pressableProps}
    >
      <View style={styles.content}>
        {icon && <View style={styles.icon}>{icon}</View>}
        {loading && (
          <ActivityIndicator
            color={variantStyles.indicator}
            style={styles.icon}
            size="small"
          />
        )}
        <Typography
          variant={variant === 'link' ? 'body' : 'button'}
          weight={variant === 'link' ? typography.weights.regular : typography.weights.semibold}
          color={variantStyles.text.color}
          style={variant === 'link' ? styles.linkLabel : undefined}
        >
          {children}
        </Typography>
      </View>
    </Pressable>
  );
};

const getVariantStyles = (
  theme: BerthcareTheme,
  variant: ButtonVariant,
  disabled?: boolean,
) => {
  const { colors } = theme.tokens;
  const disabledStyles = {
    container: {
      backgroundColor: colors.functional.surface.disabled,
      borderColor: colors.functional.border.disabled,
      borderWidth: variant === 'secondary' ? 2 : 0,
      shadowOpacity: 0,
    },
    text: { color: colors.functional.text.disabled },
    indicator: colors.functional.text.disabled,
  };

  if (disabled) {
    return {
      container: disabledStyles.container,
      pressed: {},
      text: disabledStyles.text,
      indicator: disabledStyles.indicator,
    };
  }

  const variants: Record<
    ButtonVariant,
    {
      container: ViewStyle;
      pressed: ViewStyle;
      text: { color: string };
      indicator: string;
    }
  > = {
    primary: {
      container: {
        backgroundColor: colors.functional.interactive.primary,
        borderWidth: 0,
        shadowColor: colors.overlays.shadow,
        shadowOpacity: 0.16,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
      },
      pressed: {
        backgroundColor: colors.functional.interactive.hover,
        shadowOpacity: 0.08,
      },
      text: { color: colors.functional.surface.inverse },
      indicator: colors.functional.surface.inverse,
    },
    secondary: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.functional.interactive.primary,
      },
      pressed: { backgroundColor: colors.foundation.trust[50] },
      text: { color: colors.functional.interactive.primary },
      indicator: colors.functional.interactive.primary,
    },
    destructive: {
      container: {
        backgroundColor: colors.semantic.urgent[500],
        shadowColor: colors.overlays.shadow,
        shadowOpacity: 0.16,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
      },
      pressed: { backgroundColor: colors.semantic.urgent[600], shadowOpacity: 0.08 },
      text: { color: colors.functional.surface.inverse },
      indicator: colors.functional.surface.inverse,
    },
    link: {
      container: {
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignSelf: 'flex-start',
      },
      pressed: {
        backgroundColor: colors.foundation.trust[50],
      },
      text: { color: colors.functional.text.link },
      indicator: colors.functional.text.link,
    },
  };

  return variants[variant];
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  linkLabel: {
    textDecorationLine: 'none',
  },
});
