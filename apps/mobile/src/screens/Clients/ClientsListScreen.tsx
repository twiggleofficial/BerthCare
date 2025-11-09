import { FlatList, StyleSheet, View } from 'react-native';
import { Avatar, IconButton, List } from 'react-native-paper';

import type { ClientsStackScreenProps } from '../../navigation/types';
import { AppHeader } from '../../components';
import { useManualSyncRefresh } from '../../hooks/useManualSyncRefresh';

const clients = [
  { id: 'clara-l', name: 'Clara Lewis', status: 'Visit complete' },
  { id: 'evelyn-f', name: 'Evelyn Fraser', status: 'Vitals due in 30m' },
  { id: 'margot-w', name: 'Margot White', status: 'New care plan ready' },
];

type ClientsListProps = ClientsStackScreenProps<'ClientsList'>;

export function ClientsListScreen({ navigation }: ClientsListProps) {
  const { refreshing, onRefresh } = useManualSyncRefresh();

  return (
    <View style={styles.container}>
      <AppHeader title="Clients" subtitle="Tap a client to review their plan." />
      <FlatList
        data={clients}
        keyExtractor={(client) => client.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={item.status}
            left={(props) => (
              <Avatar.Text
                {...props}
                size={40}
                label={(() => {
                  if (!item.name) {
                    return '';
                  }

                  return item.name
                    .split(' ')
                    .map((segment) => segment.trim())
                    .filter((segment) => segment.length > 0)
                    .map((segment) => segment[0].toUpperCase())
                    .slice(0, 2)
                    .join('');
                })()}
              />
            )}
            right={(props) => (
              <IconButton
                {...props}
                icon="chevron-right"
                onPress={() =>
                  navigation.navigate('ClientDetails', { clientId: item.id })
                }
              />
            )}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 72,
  },
});
