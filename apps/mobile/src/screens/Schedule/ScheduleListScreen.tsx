import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import {
  Button,
  Card,
  Chip,
  IconButton,
  ProgressBar,
  Text,
  useTheme,
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';

import { AppHeader } from '../../components';
import { colors as tokenColors } from '../../design-system/tokens/colors';
import { useManualSyncRefresh } from '../../hooks/useManualSyncRefresh';
import type { ScheduleStackScreenProps } from '../../navigation/types';
import { useCarePlanStore } from '../../state/care-plan-store';
import { QUERY_STALE_TIMES } from '../../services/api/query-client';

const fetchCareTip = async () => {
  await new Promise((resolve) => setTimeout(resolve, 450));
  return 'Confirm meds with a family member before you log the task - BerthCare auto-saves as you speak.';
};

type ScheduleListProps = ScheduleStackScreenProps<'ScheduleList'>;

export function ScheduleListScreen({ navigation }: ScheduleListProps) {
  const theme = useTheme();
  const { caregiverName, activeShiftName, tasks, upcomingVisit, toggleTask } =
    useCarePlanStore();
  const { refreshing, onRefresh } = useManualSyncRefresh();

  const { data: careTip, isPending } = useQuery({
    queryKey: ['care-tip'],
    queryFn: fetchCareTip,
    staleTime: QUERY_STALE_TIMES.stableCareData,
  });

  const completion = useMemo(() => {
    if (!tasks.length) return 0;
    return tasks.filter((task) => task.isComplete).length / tasks.length;
  }, [tasks]);

  const nextTask = useMemo(() => tasks.find((task) => !task.isComplete), [tasks]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {__DEV__ && (
        <Link
          href="/component-preview"
          style={[styles.previewLink, { color: theme.colors.primary }]}
        >
          Open component preview ↗
        </Link>
      )}
      <AppHeader
        title={`Hi ${caregiverName}, you're guiding the ${activeShiftName}`}
        subtitle="Everything syncs quietly, even when you're offline."
      />

      <Card style={styles.card}>
        <Card.Title
          title="Next visit window"
          subtitle={`${upcomingVisit.window} - ${upcomingVisit.location}`}
          left={(props) => <IconButton {...props} icon="calendar-clock" />}
        />
        <Card.Content>
          <Text variant="bodyMedium" style={styles.bodyCopy}>
            Everything auto-saves locally, so move at the pace of care - not the
            network connection.
          </Text>
          <ProgressBar
            progress={completion}
            color={theme.colors.primary}
            style={styles.progress}
          />
          <Text variant="labelMedium">{Math.round(completion * 100)}% complete</Text>
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            icon={nextTask ? 'check-circle' : 'party-popper'}
            onPress={() =>
              nextTask && navigation.navigate('VisitDetails', { visitId: nextTask.id })
            }
            disabled={!nextTask}
          >
            {nextTask ? `Complete "${nextTask.label}"` : 'Shift finished'}
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Title
          title="Care tasks"
          subtitle="Tap to mark finished - undo any time."
          left={(props) => <IconButton {...props} icon="clipboard-check-multiple" />}
        />
        <Card.Content>
          {tasks.map((task) => (
            <Chip
              key={task.id}
              mode={task.isComplete ? 'flat' : 'outlined'}
              selected={task.isComplete}
              icon={task.isComplete ? 'check-circle' : 'clock-outline'}
              style={[
                styles.taskChip,
                task.isComplete && { backgroundColor: theme.colors.surfaceVariant },
              ]}
              onPress={() => toggleTask(task.id)}
            >
              {task.label}
            </Chip>
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title
          title="Coaching tip"
          subtitle={isPending ? 'Loading the next best action...' : 'Ready when you are'}
          left={(props) => <IconButton {...props} icon="lightbulb-on" />}
        />
        <Card.Content>
          <Text variant="bodyLarge">
            {careTip ??
              'Keep vitals, meds, and notes in one steady flow - the app remembers every detail.'}
          </Text>
        </Card.Content>
      </Card>

      <Card style={[styles.card, styles.helpCard]}>
        <Card.Title
          title="Need a hand?"
          subtitle="Coordinators answer in under 2 minutes."
          titleStyle={styles.helpTitle}
          subtitleStyle={styles.helpSubtitle}
          left={(props) => (
            <IconButton
              {...props}
              icon="phone"
              iconColor={tokenColors.functional.text.inverse}
            />
          )}
        />
        <Card.Actions>
          <Button
            mode="outlined"
            icon="phone"
            textColor={tokenColors.functional.text.inverse}
            style={styles.helpButton}
            onPress={() =>
              navigation.navigate('VisitDetails', {
                visitId: 'next-visit',
              })
            }
          >
            Call coordination team
          </Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  card: {
    borderRadius: 20,
    marginBottom: 16,
  },
  bodyCopy: {
    marginBottom: 12,
  },
  progress: {
    marginVertical: 12,
    borderRadius: 8,
  },
  taskChip: {
    marginBottom: 8,
  },
  previewLink: {
    marginBottom: 12,
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  helpCard: {
    backgroundColor: tokenColors.foundation.trust[700],
  },
  helpTitle: {
    color: tokenColors.functional.text.inverse,
  },
  helpSubtitle: {
    color: tokenColors.functional.text.tertiary,
  },
  helpButton: {
    borderColor: tokenColors.functional.text.inverse,
  },
});
