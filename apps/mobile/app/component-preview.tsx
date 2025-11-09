import type { ReactNode} from 'react';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import type { BerthcareTheme } from '../src/design-system';
import {
  Button as DSButton,
  Card as DSCard,
  Input as DSInput,
  Typography,
} from '../src/components';

const buttonVariants: Array<Parameters<typeof DSButton>[0]> = [
  { children: 'Complete Visit', variant: 'primary' },
  { children: 'Save as Draft', variant: 'secondary' },
  { children: 'Delete Visit', variant: 'destructive' },
  { children: 'Skip for now', variant: 'link', fullWidth: false },
];

const typographyVariants: Array<Parameters<typeof Typography>[0]['variant']> = [
  'title',
  'heading',
  'body',
  'small',
  'caption',
];

const cardExamples = [
  {
    title: '09:00a – 09:45a · Margaret Thompson, 82',
    subtitle: '📍 123 Oak Street · 💊 Medication + Vital signs',
    meta: 'Upcoming • Syncs automatically',
    status: 'upcoming' as const,
  },
  {
    title: '11:30a – 12:15p · Isaiah Bennett, 71',
    subtitle: '📍 89 Pine Grove · 🩺 Wound care follow-up',
    meta: 'In progress • Offline safe',
    status: 'inProgress' as const,
    offline: true,
  },
  {
    title: '2:00p – 3:00p · Rina Carter, 68',
    subtitle: '📍 10 Cedar Row · 🧠 Cognitive exercises',
    meta: 'Overdue • Needs attention',
    status: 'overdue' as const,
  },
];

export default function ComponentPreviewScreen() {
  const theme = useTheme<BerthcareTheme>();
  const { spacing, colors } = theme.tokens;
  const [notes, setNotes] = useState('Vitals trending steady. Continue hydration coaching.');
  const [bloodPressure, setBloodPressure] = useState('118/78');

  const containerStyle = useMemo(
    () => ({
      padding: spacing.scale.lg,
      backgroundColor: colors.functional.surface.secondary,
      gap: spacing.scale.xl,
    }),
    [colors.functional.surface.secondary, spacing.scale.lg, spacing.scale.xl],
  );

  return (
    <ScrollView contentContainerStyle={[styles.container, containerStyle]}>
      <Typography variant="title">
        Component preview
      </Typography>
      <Typography color={colors.functional.text.secondary}>
        This gallery mirrors specs from design-documentation/design-system/components and
        design-documentation/accessibility/wcag-compliance.md so reviewers can
        confirm behavior without wiring real data.
      </Typography>

      <Section
        title="Buttons"
        description="Primary, secondary, destructive, and link states with 56pt touch targets."
      >
        <View style={styles.stack}>
          {buttonVariants.map((props, index) => (
            <DSButton key={`${props.variant}-${index}`} {...props} />
          ))}
          <DSButton loading>Syncing offline chart</DSButton>
          <DSButton disabled>Requires supervisor approval</DSButton>
        </View>
      </Section>

      <Section
        title="Cards"
        description="Visit cards with status rail, offline indicator, and pressed feedback."
      >
        <View style={styles.stack}>
          {cardExamples.map((example) => (
            <DSCard
              key={example.title}
              title={example.title}
              subtitle={example.subtitle}
              meta={example.meta}
              status={example.status}
              offline={example.offline}
            />
          ))}
        </View>
      </Section>

      <Section
        title="Inputs"
        description="Persistent labels, focus ring, and validation states from forms spec."
      >
        <View style={styles.stack}>
          <DSInput
            label="Visit notes"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            contextText="Auto-saved locally every second"
          />
          <DSInput
            label="Blood pressure"
            value={bloodPressure}
            onChangeText={setBloodPressure}
            validationState="success"
            helperText="Matches trend line from last 3 visits"
          />
          <DSInput
            label="Controlled meds count"
            placeholder="e.g., 12 tablets"
            validationState="error"
            helperText="Count cannot decrease by more than 2 without supervisor sign-off"
          />
        </View>
      </Section>

      <Section
        title="Typography scale"
        description="Direct pull from typography tokens to keep hierarchy consistent."
      >
        <View style={styles.typographyGroup}>
          {typographyVariants.map((variant) => (
            <View style={styles.typographyRow} key={variant}>
              <Typography variant="small" color={colors.functional.text.secondary}>
                {variant}
              </Typography>
              <Typography variant={variant}>
                Care stays obvious when text follows predictable roles.
              </Typography>
            </View>
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}

type SectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

const Section = ({ title, description, children }: SectionProps) => {
  const theme = useTheme<BerthcareTheme>();
  const { spacing, colors } = theme.tokens;

  return (
    <View style={[styles.section, { gap: spacing.scale.xs }]}>
      <Typography variant="heading">{title}</Typography>
      {description && (
        <Typography color={colors.functional.text.secondary}>{description}</Typography>
      )}
      <View style={{ gap: spacing.scale.md }}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  stack: {
    gap: 16,
  },
  section: {
    width: '100%',
  },
  typographyGroup: {
    gap: 12,
  },
  typographyRow: {
    gap: 2,
  },
});
