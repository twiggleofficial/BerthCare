import { StyleSheet, View } from 'react-native';
import { Button, Card, List, Text } from 'react-native-paper';

import type { ProfileStackScreenProps } from '../../navigation/types';

type ProfileHomeProps = ProfileStackScreenProps<'ProfileHome'>;

export function ProfileHomeScreen({ navigation }: ProfileHomeProps) {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Your profile</Text>
      <Card style={styles.card}>
        <List.Item
          title="Avery"
          description="Lead Caregiver"
          left={(props) => <List.Icon {...props} icon="account-heart-outline" />}
        />
        <List.Item
          title="Shift preference"
          description="Sunrise rounds"
          left={(props) => <List.Icon {...props} icon="white-balance-sunny" />}
        />
      </Card>
      <Button
        mode="contained-tonal"
        onPress={() => navigation.navigate('Settings')}
        icon="account-cog"
      >
        Care settings
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
  card: {
    borderRadius: 20,
  },
});
