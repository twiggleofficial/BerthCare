import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import type { BerthcareTheme } from '../../design-system';
import { Typography } from '../Typography';

export type SectionProps = {
  title: string;
  children: ReactNode;
  style?: ViewStyle;
  testID?: string;
};

export const Section = ({ title, children, style, testID }: SectionProps) => {
  const theme = useTheme<BerthcareTheme>();
  const { spacing, colors, typography } = theme.tokens;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={title}
      testID={testID}
      style={[
        styles.section,
        {
          padding: spacing.scale.md,
          borderRadius: theme.roundness,
          borderColor: colors.functional.border.subtle,
          gap: spacing.layout.formFieldGap,
        },
        style,
      ]}
    >
      <Typography
        variant="heading"
        weight={typography.weights.semibold}
        accessibilityRole="header"
      >
        {title}
      </Typography>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
