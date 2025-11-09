import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

import type { BerthcareTheme } from '../../design-system';
import { Typography } from '../Typography';

export const LoadingState = () => {
  const theme = useTheme<BerthcareTheme>();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator animating color={theme.colors.primary} accessibilityLabel="Loading" />
      <Typography color={theme.tokens.colors.functional.text.secondary}>
        Preparing offline notes…
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
});
