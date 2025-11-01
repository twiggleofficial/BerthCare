type CarePlanRequest = {
  clientId?: unknown;
  summary?: unknown;
  medications?: unknown;
  allergies?: unknown;
  specialInstructions?: unknown;
};

type MedicationInput = {
  name?: unknown;
  dosage?: unknown;
  frequency?: unknown;
};

export type SanitisedCarePlanMedication = {
  name: string;
  dosage: string;
  frequency: string;
};

export type SanitisedCarePlanPayload = {
  clientId: string;
  summary: string;
  medications: SanitisedCarePlanMedication[];
  allergies: string[];
  specialInstructions: string;
};

type ValidationResult =
  | { ok: true; value: SanitisedCarePlanPayload }
  | { ok: false; errors: string[] };

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const MAX_SUMMARY_LENGTH = 1000;
const MAX_SPECIAL_INSTRUCTIONS_LENGTH = 2000;
const MAX_MEDICATIONS = 50;
const MAX_ALLERGIES = 50;
const MAX_TEXT_FIELD_LENGTH = 200;

const sanitiseString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitiseOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim();
};

const parseClientId = (value: unknown, errors: string[]): string | undefined => {
  const stringValue = sanitiseString(value);

  if (!stringValue) {
    errors.push('clientId is required');
    return undefined;
  }

  if (!UUID_REGEX.test(stringValue)) {
    errors.push('clientId must be a valid UUID');
    return undefined;
  }

  return stringValue;
};

const parseSummary = (value: unknown, errors: string[]): string | undefined => {
  const stringValue = sanitiseString(value);

  if (!stringValue) {
    errors.push('summary is required');
    return undefined;
  }

  if (stringValue.length > MAX_SUMMARY_LENGTH) {
    errors.push(`summary must be ${MAX_SUMMARY_LENGTH} characters or fewer`);
    return undefined;
  }

  return stringValue;
};

const parseMedications = (
  value: unknown,
  errors: string[]
): SanitisedCarePlanMedication[] | undefined => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    errors.push('medications must be an array');
    return undefined;
  }

  if (value.length > MAX_MEDICATIONS) {
    errors.push(`medications must contain ${MAX_MEDICATIONS} items or fewer`);
    return undefined;
  }

  const sanitized: SanitisedCarePlanMedication[] = [];
  let hasError = false;

  value.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`medications[${index}] must be an object`);
      hasError = true;
      return;
    }

    const raw = entry as MedicationInput;
    const name = sanitiseString(raw.name);

    if (!name) {
      errors.push(`medications[${index}].name is required`);
      hasError = true;
      return;
    }

    if (name.length > MAX_TEXT_FIELD_LENGTH) {
      errors.push(
        `medications[${index}].name must be ${MAX_TEXT_FIELD_LENGTH} characters or fewer`
      );
      hasError = true;
      return;
    }

    const dosage = sanitiseOptionalString(raw.dosage) ?? '';
    if (dosage.length > MAX_TEXT_FIELD_LENGTH) {
      errors.push(
        `medications[${index}].dosage must be ${MAX_TEXT_FIELD_LENGTH} characters or fewer`
      );
      hasError = true;
      return;
    }

    const frequency = sanitiseOptionalString(raw.frequency) ?? '';
    if (frequency.length > MAX_TEXT_FIELD_LENGTH) {
      errors.push(
        `medications[${index}].frequency must be ${MAX_TEXT_FIELD_LENGTH} characters or fewer`
      );
      hasError = true;
      return;
    }

    sanitized.push({
      name,
      dosage,
      frequency,
    });
  });

  return hasError ? undefined : sanitized;
};

const parseAllergies = (value: unknown, errors: string[]): string[] | undefined => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    errors.push('allergies must be an array');
    return undefined;
  }

  if (value.length > MAX_ALLERGIES) {
    errors.push(`allergies must contain ${MAX_ALLERGIES} items or fewer`);
    return undefined;
  }

  const sanitized: string[] = [];
  let hasError = false;

  value.forEach((entry, index) => {
    const stringValue = sanitiseString(entry);

    if (!stringValue) {
      errors.push(`allergies[${index}] must be a non-empty string`);
      hasError = true;
      return;
    }

    if (stringValue.length > MAX_TEXT_FIELD_LENGTH) {
      errors.push(`allergies[${index}] must be ${MAX_TEXT_FIELD_LENGTH} characters or fewer`);
      hasError = true;
      return;
    }

    sanitized.push(stringValue);
  });

  return hasError ? undefined : sanitized;
};

const parseSpecialInstructions = (value: unknown, errors: string[]): string | undefined => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    errors.push('specialInstructions must be a string');
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length > MAX_SPECIAL_INSTRUCTIONS_LENGTH) {
    errors.push(
      `specialInstructions must be ${MAX_SPECIAL_INSTRUCTIONS_LENGTH} characters or fewer`
    );
    return undefined;
  }

  return trimmed;
};

export const sanitiseCarePlanPayload = (body: CarePlanRequest): ValidationResult => {
  const errors: string[] = [];

  const clientId = parseClientId(body.clientId, errors);
  const summary = parseSummary(body.summary, errors);
  const medications = parseMedications(body.medications, errors);
  const allergies = parseAllergies(body.allergies, errors);
  const specialInstructions = parseSpecialInstructions(body.specialInstructions, errors);

  if (
    !clientId ||
    !summary ||
    medications === undefined ||
    allergies === undefined ||
    specialInstructions === undefined
  ) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      clientId,
      summary,
      medications,
      allergies,
      specialInstructions,
    },
  };
};
