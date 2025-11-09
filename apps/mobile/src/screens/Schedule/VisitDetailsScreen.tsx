import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import type { ScheduleStackScreenProps } from '../../navigation/types';

type VisitDetailsProps = ScheduleStackScreenProps<'VisitDetails'>;

export function VisitDetailsScreen({ route, navigation }: VisitDetailsProps) {
  const { visitId } = route.params;

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Visit details</Text>
      <Text variant="bodyMedium" style={styles.copy}>
        {`You’re documenting visit "${visitId}". Notes auto-save offline, so keep your
care flow uninterrupted.`}
      </Text>
      <Button
        mode="contained"
        onPress={() =>
          navigation.reset({
            index: 0,
            routes: [{ name: 'ScheduleList' }],
          })
        }
      >
        Back to schedule
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  copy: {
    lineHeight: 20,
  },
});
