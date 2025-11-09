import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Divider, useTheme } from 'react-native-paper';
import { useDatabase } from '@nozbe/watermelondb/hooks';

import type { ScheduleStackScreenProps } from '../../navigation/types';
import type { BerthcareTheme } from '../../design-system';
import { AutoSaveIndicator, Button, Input, LoadingState, Section, Typography } from '../../components';
import { SyncQueue } from '../../services/sync/SyncQueue';
import {
  VisitDocumentationRepository,
  type UpdateVisitDocumentationInput,
} from '../../database/repositories/visit-documentation-repository';
import type { VisitDocumentation } from '../../database/models/visit-documentation';
import type { VisitActivities, VitalSigns } from '../../database/types';
import { useAutoSave } from '../../hooks/useAutoSave';
import { createLogger } from '../../services/logger';

type VisitDetailsProps = ScheduleStackScreenProps<'VisitDetails'>;

type VitalSignsDraft = {
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  heartRate: string;
  temperature: string;
  oxygenSaturation: string;
};

type VisitDocumentationDraft = {
  vitalSigns: VitalSignsDraft;
  activities: VisitActivities & { other?: string };
  observations: string;
  concerns: string;
};

const emptyDraft: VisitDocumentationDraft = {
  vitalSigns: {
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
  },
  activities: {
    personalCare: false,
    medication: false,
    mealPreparation: false,
    mobility: false,
    other: '',
  },
  observations: '',
  concerns: '',
};

const activityLabels: Record<Exclude<keyof VisitActivities, 'other'>, string> = {
  personalCare: 'Personal care',
  medication: 'Medication support',
  mealPreparation: 'Meal preparation',
  mobility: 'Mobility + transfers',
};

const logger = createLogger('visit-details-screen');

// Implements the invisible auto-save visit documentation flow from
// `project-documentation/architecture-output.md` (Auto-Save System +
// Visit Documentation flow) so caregivers never look for a save button.
export function VisitDetailsScreen({ route, navigation }: VisitDetailsProps) {
  const { visitId } = route.params;
  const theme = useTheme<BerthcareTheme>();
  const database = useDatabase();
  const queue = useMemo(() => new SyncQueue(database), [database]);
  const repository = useMemo(
    () => new VisitDocumentationRepository({ database, queue }),
    [database, queue],
  );

  const [documentation, setDocumentation] = useState<VisitDocumentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  const activeRecordRef = useRef<VisitDocumentation | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const fetchOrCreate = async () => {
      try {
        const docs = await repository.getByVisit(visitId);
        let record = docs[0];
        if (!record) {
          record = await repository.create({ visitId });
        }

        if (!cancelled && isMountedRef.current) {
          setDocumentation(record);
          activeRecordRef.current = record;
        }
      } catch (error) {
        logger.error('Failed to prepare visit documentation', { visitId, error });
      } finally {
        if (!cancelled && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    void fetchOrCreate();
    return () => {
      cancelled = true;
    };
  }, [repository, visitId]);

  useEffect(() => {
    activeRecordRef.current = documentation;
  }, [documentation]);

  const persistDraft = useCallback(
    async (draft: VisitDocumentationDraft) => {
      const current = activeRecordRef.current;
      if (!current) {
        return;
      }

      try {
        const updated = await repository.update(current.id, draftToUpdateInput(draft));
        if (isMountedRef.current) {
          setDocumentation(updated);
          activeRecordRef.current = updated;
        }
      } catch (error) {
        logger.error('Auto-save failed', { visitId, recordId: current.id, error });
        throw error;
      }
    },
    [repository, visitId],
  );

  const initialDraft = useMemo(
    () => (documentation ? mapDocumentToDraft(documentation) : emptyDraft),
    [documentation],
  );

  const autoSave = useAutoSave<VisitDocumentationDraft>({
    initialValues: initialDraft,
    save: persistDraft,
    navigation,
    enabled: Boolean(documentation),
    resetKey: documentation?.id ?? 'pending',
    initialLastSavedAt: documentation?.updatedAt ?? null,
  });

  const { values, setValues, status, lastSavedAt, isDirty, handleBlur, triggerSave } = autoSave;

  const handleVitalChange = useCallback(
    (field: keyof VitalSignsDraft, value: string) => {
      setValues((prev) => ({
        ...prev,
        vitalSigns: {
          ...prev.vitalSigns,
          [field]: value,
        },
      }));
    },
    [setValues],
  );

  const handleActivityToggle = useCallback(
    (key: Exclude<keyof VisitActivities, 'other'>) => {
      setValues((prev) => ({
        ...prev,
        activities: {
          ...prev.activities,
          [key]: !prev.activities[key],
        },
      }));
    },
    [setValues],
  );

  const handleTextChange = useCallback(
    (field: 'observations' | 'concerns', value: string) => {
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [setValues],
  );

  const handleOtherActivityChange = useCallback(
    (value: string) => {
      setValues((prev) => ({
        ...prev,
        activities: {
          ...prev.activities,
          other: value,
        },
      }));
    },
    [setValues],
  );

  const handleClose = useCallback(() => {
    void (async () => {
      await triggerSave('manual');
      navigation.goBack();
    })();
  }, [navigation, triggerSave]);

  if (isLoading && !documentation) {
    return <LoadingState />;
  }

  const spacing = theme.tokens.spacing;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { padding: spacing.scale.lg, gap: spacing.layout.sectionGap },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Typography variant="title" weight={theme.tokens.typography.weights.semibold}>
          Visit documentation
        </Typography>
        <Typography color={theme.tokens.colors.functional.text.secondary}>
          Notes auto-save offline for visit “{visitId}”. Capture care as it happens—the app keeps up.
        </Typography>
      </View>

      <AutoSaveIndicator status={status} lastSavedAt={lastSavedAt} isDirty={isDirty} />

      <Section title="Vital signs">
        <Input
          label="Blood pressure — systolic"
          value={values.vitalSigns.bloodPressureSystolic}
          onChangeText={(text) => handleVitalChange('bloodPressureSystolic', text)}
          keyboardType="numeric"
          contextText="1-second debounce per Auto-Save blueprint."
          onBlur={handleBlur}
        />
        <Input
          label="Blood pressure — diastolic"
          value={values.vitalSigns.bloodPressureDiastolic}
          onChangeText={(text) => handleVitalChange('bloodPressureDiastolic', text)}
          keyboardType="numeric"
          onBlur={handleBlur}
        />
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Input
              label="Heart rate"
              value={values.vitalSigns.heartRate}
              onChangeText={(text) => handleVitalChange('heartRate', text)}
              keyboardType="numeric"
              onBlur={handleBlur}
            />
          </View>
          <View style={styles.column}>
            <Input
              label="Temperature (°C)"
              value={values.vitalSigns.temperature}
              onChangeText={(text) => handleVitalChange('temperature', text)}
              keyboardType="decimal-pad"
              onBlur={handleBlur}
            />
          </View>
        </View>
        <Input
          label="Oxygen saturation (%)"
          value={values.vitalSigns.oxygenSaturation}
          onChangeText={(text) => handleVitalChange('oxygenSaturation', text)}
          keyboardType="numeric"
          onBlur={handleBlur}
        />
      </Section>

      <Section title="Activities completed">
        <View style={styles.activityGrid}>
          {(Object.keys(activityLabels) as Array<Exclude<keyof VisitActivities, 'other'>>).map(
            (key) => (
              <Chip
                key={key}
                mode={values.activities[key] ? 'flat' : 'outlined'}
                selected={values.activities[key]}
                compact
                style={[
                  styles.activityChip,
                  values.activities[key] && {
                    backgroundColor: theme.tokens.colors.foundation.trust[50],
                  },
                ]}
                onPress={() => handleActivityToggle(key)}
              >
                {activityLabels[key]}
              </Chip>
            ),
          )}
        </View>
        <Input
          label="Other activity (optional)"
          value={values.activities.other ?? ''}
          onChangeText={handleOtherActivityChange}
          placeholder="Describe anything unique this visit"
          onBlur={handleBlur}
        />
      </Section>

      <Section title="Observations">
        <Input
          label="What stood out?"
          multiline
          numberOfLines={4}
          value={values.observations}
          onChangeText={(text) => handleTextChange('observations', text)}
          onBlur={handleBlur}
        />
        <Divider />
        <Input
          label="Concerns to flag"
          multiline
          numberOfLines={3}
          value={values.concerns}
          onChangeText={(text) => handleTextChange('concerns', text)}
          onBlur={handleBlur}
          helperText="Auto-synced to coordinators once you reconnect."
        />
      </Section>

      <Button variant="secondary" onPress={handleClose}>
        Back to schedule
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: 96,
  },
  header: {
    gap: 8,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityChip: {
    marginBottom: 4,
  },
});

const sanitizeNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

type VitalSignField = keyof VitalSignsDraft & keyof VitalSigns;

const vitalSignKeys: VitalSignField[] = [
  'bloodPressureSystolic',
  'bloodPressureDiastolic',
  'heartRate',
  'temperature',
  'oxygenSaturation',
];

const buildVitalSignsPatch = (draft: VitalSignsDraft): Partial<VitalSigns> =>
  vitalSignKeys.reduce<Partial<VitalSigns>>((acc, key) => {
    const sanitized = sanitizeNumber(draft[key]);
    if (sanitized !== null) {
      acc[key] = sanitized;
    }
    return acc;
  }, {});

const mapDocumentToDraft = (record: VisitDocumentation): VisitDocumentationDraft => ({
  vitalSigns: {
    bloodPressureSystolic: numberToString(record.vitalSigns.bloodPressureSystolic),
    bloodPressureDiastolic: numberToString(record.vitalSigns.bloodPressureDiastolic),
    heartRate: numberToString(record.vitalSigns.heartRate),
    temperature: numberToString(record.vitalSigns.temperature),
    oxygenSaturation: numberToString(record.vitalSigns.oxygenSaturation),
  },
  activities: {
    personalCare: record.activities.personalCare,
    medication: record.activities.medication,
    mealPreparation: record.activities.mealPreparation,
    mobility: record.activities.mobility,
    other: record.activities.other ?? '',
  },
  observations: record.observations ?? '',
  concerns: record.concerns ?? '',
});

const numberToString = (value?: number | null): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${value}` : '';

const draftToUpdateInput = (draft: VisitDocumentationDraft): UpdateVisitDocumentationInput => {
  return {
    vitalSigns: buildVitalSignsPatch(draft.vitalSigns),
    activities: {
      personalCare: draft.activities.personalCare,
      medication: draft.activities.medication,
      mealPreparation: draft.activities.mealPreparation,
      mobility: draft.activities.mobility,
      other: draft.activities.other?.trim() ?? undefined,
    },
    observations: sanitizeText(draft.observations),
    concerns: sanitizeText(draft.concerns),
  };
};
