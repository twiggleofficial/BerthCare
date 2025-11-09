import { StyleSheet, View } from 'react-native';
import { Button, Card, List, Text } from 'react-native-paper';

import type { ProfileStackScreenProps } from '../../navigation/types';
import { useAppStore } from '../../store';
import type { UserProfile } from '../../store/types';

type ProfileHomeProps = ProfileStackScreenProps<'ProfileHome'>;

export function ProfileHomeScreen({ navigation }: ProfileHomeProps) {
  const profile = useAppStore((state) => state.user);
  const profileName = getProfileName(profile);
  const roleLabel = profile ? ROLE_LABELS[profile.role] ?? profile.role : FALLBACK_TEXT;
  const shiftPreference = getShiftPreference(profile);

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Your profile</Text>
      <Card style={styles.card}>
        <List.Item
          title={profileName}
          description={roleLabel}
          left={(props) => <List.Icon {...props} icon="account-heart-outline" />}
        />
        <List.Item
          title="Shift preference"
          description={shiftPreference}
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

const FALLBACK_TEXT = '—';

const ROLE_LABELS: Record<UserProfile['role'], string> = {
  caregiver: 'Caregiver',
  coordinator: 'Care Coordinator',
  family: 'Family Member',
  operations: 'Operations',
  admin: 'Administrator',
};

const getProfileName = (user: UserProfile | null): string => {
  if (!user) {
    return FALLBACK_TEXT;
  }

  const fullName = [user.firstName, user.lastName]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ');

  return fullName || user.email?.trim() || FALLBACK_TEXT;
};

const getShiftPreference = (user: UserProfile | null): string => {
  if (!user) {
    return FALLBACK_TEXT;
  }

  const preference = (user.shiftPreference ?? '').trim();
  return preference || FALLBACK_TEXT;
};

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
