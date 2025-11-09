import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import type { BerthcareTheme } from '../../design-system';
import { Typography } from '../Typography';

export type SectionProps = {
  title: string;
  children: ReactNode;
};

export const Section = ({ title, children }: SectionProps) => {
  const theme = useTheme<BerthcareTheme>();
  const { spacing, colors, typography } = theme.tokens;

  return (
    <View
      style={[
        styles.section,
        {
          padding: spacing.scale.md,
          borderRadius: theme.roundness,
          borderColor: colors.functional.border.subtle,
          gap: spacing.layout.formFieldGap,
        },
      ]}
    >
      <Typography variant="heading" weight={typography.weights.semibold}>
        {title}
      </Typography>
      <View>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
