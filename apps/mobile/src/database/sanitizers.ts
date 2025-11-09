import type { VisitActivities, VitalSigns } from './types';

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
};

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value === 'true';
  }

  return fallback;
};

export const sanitizeAllergies = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

export const sanitizeVitalSigns = (value: unknown): VitalSigns => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const readings = value as Partial<Record<keyof VitalSigns, unknown>>;

  return {
    bloodPressureSystolic: toNumber(readings.bloodPressureSystolic),
    bloodPressureDiastolic: toNumber(readings.bloodPressureDiastolic),
    heartRate: toNumber(readings.heartRate),
    temperature: toNumber(readings.temperature),
    oxygenSaturation: toNumber(readings.oxygenSaturation),
  };
};

export const sanitizeActivities = (value: unknown): VisitActivities => {
  if (!value || typeof value !== 'object') {
    return {
      personalCare: false,
      medication: false,
      mealPreparation: false,
      mobility: false,
    };
  }

  const activityValues = value as Partial<Record<keyof VisitActivities, unknown>>;

  return {
    personalCare: toBoolean(activityValues.personalCare),
    medication: toBoolean(activityValues.medication),
    mealPreparation: toBoolean(activityValues.mealPreparation),
    mobility: toBoolean(activityValues.mobility),
    other:
      typeof activityValues.other === 'string' && activityValues.other.trim().length > 0
        ? activityValues.other
        : undefined,
  };
};

export const sanitizeQueuePayload = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return null;
  }
};
