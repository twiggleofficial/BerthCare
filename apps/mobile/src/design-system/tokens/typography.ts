/**
 * Typography tokens from design-documentation/design-system/tokens/typography.md.
 * Optimized for caregivers on the move—minimal styles, maximum readability.
 */
export const typography = {
  fontFamily: {
    // Mobile relies on the platform default; web-specific stacks live in the shared tokens package.
    base: 'System',
  },
  weights: {
    regular: '400',
    semibold: '600',
    bold: '700',
  },
  scale: {
    title: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    heading: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600',
      letterSpacing: 0,
    },
    body: {
      fontSize: 17,
      lineHeight: 26,
      fontWeight: '400',
      letterSpacing: 0,
    },
    small: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400',
      letterSpacing: 0,
    },
    button: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '600',
      letterSpacing: 0,
    },
    caption: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '400',
      letterSpacing: 0,
    },
  },
  letterSpacing: {
    tight: -0.5,
    default: 0,
  },
} as const;

export type TypographyTokens = typeof typography;
