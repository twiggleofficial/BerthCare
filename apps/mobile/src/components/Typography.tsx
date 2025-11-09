import { forwardRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { useTheme } from 'react-native-paper';

import type { BerthcareTheme } from '../design-system';

type TypographyVariant = 'title' | 'heading' | 'body' | 'small' | 'button' | 'caption';
type TypographyWeight = TextStyle['fontWeight'];

export type TypographyProps = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  weight?: TypographyWeight;
};

/**
 * Mirrors design-documentation/design-system/style-guide.md while following
 * design-documentation/accessibility/wcag-compliance.md so hierarchy is predictable
 * and copy stays readable in every care environment.
 */
export const Typography = forwardRef<Text, TypographyProps>(function Typography(
  { children, variant = 'body', weight, color, style, ...rest },
  ref,
) {
  const theme = useTheme<BerthcareTheme>();
  const { typography } = theme.tokens;

  const baseStyle = typography.scale[variant];

  const resolvedWeight = (weight ?? baseStyle.fontWeight) as TextStyle['fontWeight'];

  return (
    <Text
      ref={ref}
      {...rest}
      style={[
        styles.text,
        {
          fontFamily: typography.fontFamily.base,
          color: color ?? theme.tokens.colors.functional.text.primary,
          fontWeight: resolvedWeight,
          fontSize: baseStyle.fontSize,
          lineHeight: baseStyle.lineHeight,
          letterSpacing: baseStyle.letterSpacing ?? typography.letterSpacing.default,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
});

const styles = StyleSheet.create({
  text: {
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
});
