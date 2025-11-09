import type { MD3Theme } from 'react-native-paper';
import { configureFonts, MD3LightTheme } from 'react-native-paper';

import { colors, type ColorTokens } from './tokens/colors';
import { motion, type MotionTokens } from './tokens/motion';
import { spacing, type SpacingTokens } from './tokens/spacing';
import { typography, type TypographyTokens } from './tokens/typography';

type ScaleKey = keyof typeof typography.scale;
type AllowedFontWeight =
  | 'normal'
  | 'bold'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';
type FontWeightValue =
  | TypographyTokens['weights'][keyof TypographyTokens['weights']]
  | AllowedFontWeight;

const toFontWeight = (value: FontWeightValue): AllowedFontWeight => {
  return typeof value === 'number' ? (`${value}` as AllowedFontWeight) : value;
};

const createFont = (key: ScaleKey, fontWeight?: FontWeightValue) => {
  const {
    fontSize,
    lineHeight,
    fontWeight: weight,
    letterSpacing = typography.letterSpacing.default,
  } = typography.scale[key];
  return {
    fontFamily: typography.fontFamily.base,
    fontWeight: toFontWeight(fontWeight ?? weight),
    fontSize,
    lineHeight,
    letterSpacing,
  };
};

const fontConfig = configureFonts({
  config: {
    displayLarge: createFont('title', typography.weights.bold),
    headlineMedium: createFont('heading'),
    headlineSmall: createFont('heading'),
    titleLarge: createFont('heading'),
    titleMedium: createFont('title'),
    bodyLarge: createFont('body'),
    bodyMedium: createFont('small'),
    bodySmall: createFont('small'),
    labelLarge: createFont('button'),
    labelSmall: createFont('small', typography.weights.semibold),
  },
});

export type BerthcareTheme = MD3Theme & {
  tokens: {
    colors: ColorTokens;
    typography: TypographyTokens;
    spacing: SpacingTokens;
    motion: MotionTokens;
  };
};

// Caregiver-first Paper theme: every component surfaces critical actions quickly
// so flows stay obvious and delightfully low-friction in the field.
export const theme: BerthcareTheme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.foundation.trust[500],
    primaryContainer: colors.foundation.trust[50],
    secondary: colors.foundation.care[500],
    secondaryContainer: colors.foundation.care[50],
    tertiary: colors.semantic.complete[500],
    tertiaryContainer: colors.semantic.complete[50],
    error: colors.semantic.urgent[500],
    background: colors.functional.surface.primary,
    surface: colors.functional.surface.primary,
    surfaceVariant: colors.functional.surface.secondary,
    outline: colors.functional.border.default,
    outlineVariant: colors.functional.border.subtle,
    onPrimary: colors.functional.surface.inverse,
    onSecondary: colors.functional.surface.inverse,
    onSurface: colors.functional.text.primary,
    onSurfaceVariant: colors.functional.text.secondary,
    onBackground: colors.functional.text.primary,
    onTertiary: colors.functional.surface.inverse,
    onError: colors.functional.surface.inverse,
    inversePrimary: colors.foundation.trust[700],
    inverseSurface: colors.functional.text.primary,
    inverseOnSurface: colors.functional.surface.primary,
    backdrop: colors.functional.surface.overlay,
    surfaceDisabled: colors.functional.text.disabled,
    onSurfaceDisabled: colors.functional.text.tertiary,
    shadow: colors.overlays.shadow,
  },
  fonts: fontConfig,
  tokens: {
    colors,
    typography,
    spacing,
    motion,
  },
};
