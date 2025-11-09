import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';

import type { ClientsStackScreenProps } from '../../navigation/types';

const CLIENT_DETAILS: Record<
  string,
  {
    name: string;
    careFocus: Array<{ icon: string; label: string }>;
  }
> = {
  'clara-l': {
    name: 'Clara Lewis',
    careFocus: [
      { icon: 'heart-pulse', label: 'Vitals trend review' },
      { icon: 'cup-water', label: 'Hydration check-ins' },
    ],
  },
  'evelyn-f': {
    name: 'Evelyn Fraser',
    careFocus: [
      { icon: 'pill', label: 'Medication reminders' },
      { icon: 'calendar', label: 'IV therapy schedule' },
    ],
  },
  'margot-w': {
    name: 'Margot White',
    careFocus: [
      { icon: 'brain', label: 'Cognitive exercises' },
      { icon: 'clipboard-heart', label: 'Care plan updates' },
    ],
  },
};

type ClientDetailsProps = ClientsStackScreenProps<'ClientDetails'>;

export function ClientDetailsScreen({ route, navigation }: ClientDetailsProps) {
  const { clientId } = route.params;
  const clientProfile =
    CLIENT_DETAILS[clientId] ?? {
      name: `Client ${clientId}`,
      careFocus: [{ icon: 'information', label: 'Care focus pending' }],
    };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">{clientProfile.name}</Text>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Care focus</Text>
          {clientProfile.careFocus.map((focus) => (
            <Chip style={styles.chip} icon={focus.icon} key={`${clientId}-${focus.label}`}>
              {focus.label}
            </Chip>
          ))}
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
