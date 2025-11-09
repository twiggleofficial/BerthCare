import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';

import type { ClientsStackScreenProps } from '../../navigation/types';

type ClientDetailsProps = ClientsStackScreenProps<'ClientDetails'>;

export function ClientDetailsScreen({ route, navigation }: ClientDetailsProps) {
  const { clientId } = route.params;

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">{`Client: ${clientId}`}</Text>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Care focus</Text>
          <Chip style={styles.chip} icon="heart-pulse">
            Vitals
          </Chip>
          <Chip style={styles.chip} icon="pill">
            Med reminders
          </Chip>
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('ClientsList')}
            icon="arrow-left"
          >
            Back to clients
          </Button>
        </Card.Actions>
      </Card>
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
  chip: {
    marginTop: 12,
  },
});
