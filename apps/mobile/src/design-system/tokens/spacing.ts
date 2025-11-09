/**
 * Spacing tokens from design-documentation/design-system/tokens/spacing.md.
 * Locked to the 8-point grid so caregiver flows stay predictable even when
 * they're documenting visits one-handed.
 */
export const spacing = {
  unit: 8,
  grid: [4, 8, 16, 24, 32, 48] as const,
  scale: {
    '2xs': 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  touch: {
    min: 48,
    comfortable: 56,
    primary: 64,
  },
  layout: {
    screenMargin: {
      mobile: 16,
      tablet: 24,
      desktop: 32,
    },
    formFieldGap: 20,
    sectionGap: 32,
    bottomActionPadding: 16,
  },
} as const;

export type SpacingTokens = typeof spacing;
