type CreateClientRequest = {
  firstName?: unknown;
  lastName?: unknown;
  dateOfBirth?: unknown;
  address?: unknown;
  phone?: unknown;
  emergencyContact?: unknown;
};

type UpdateClientRequest = {
  firstName?: unknown;
  lastName?: unknown;
  dateOfBirth?: unknown;
  address?: unknown;
  phone?: unknown;
  emergencyContact?: unknown;
};

export type SanitisedEmergencyContact = {
  name: string;
  phone: string;
  relationship?: string;
};

export type SanitisedCreateClientPayload = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  phone?: string;
  emergencyContact?: SanitisedEmergencyContact;
};

export type SanitisedUpdateClientPayload = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  address?: string;
  phone?: string | null;
  emergencyContact?: SanitisedEmergencyContact | null;
};

type ValidationResult =
  | { ok: true; value: SanitisedCreateClientPayload }
  | { ok: false; errors: string[] };

type UpdateValidationResult =
  | { ok: true; value: SanitisedUpdateClientPayload }
  | { ok: false; errors: string[] };

const MAX_NAME_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 500;
const PHONE_REGEX = /^[+()0-9-\s]{7,25}$/;
const MIN_DATE_OF_BIRTH = new Date('1900-01-01');

const sanitiseString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normaliseDate = (date: Date): string => date.toISOString().slice(0, 10);

const parseDateOfBirth = (value: unknown, errors: string[]): string | undefined => {
  const raw = sanitiseString(value);

  if (!raw) {
    errors.push('dateOfBirth is required');
    return undefined;
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    errors.push('dateOfBirth must be a valid ISO 8601 date');
    return undefined;
  }

  const today = new Date();
  if (parsed > today) {
    errors.push('dateOfBirth cannot be in the future');
    return undefined;
  }

  if (parsed < MIN_DATE_OF_BIRTH) {
    errors.push('dateOfBirth must be on or after 1900-01-01');
    return undefined;
  }

  return normaliseDate(parsed);
};

const parseName = (value: unknown, field: string, errors: string[]): string | undefined => {
  const stringValue = sanitiseString(value);

  if (!stringValue) {
    errors.push(`${field} is required`);
    return undefined;
  }

  if (stringValue.length > MAX_NAME_LENGTH) {
    errors.push(`${field} must be ${MAX_NAME_LENGTH} characters or fewer`);
    return undefined;
  }

  return stringValue;
};

const parseAddress = (value: unknown, errors: string[]): string | undefined => {
  const stringValue = sanitiseString(value);

  if (!stringValue) {
    errors.push('address is required');
    return undefined;
  }

  if (stringValue.length > MAX_ADDRESS_LENGTH) {
    errors.push(`address must be ${MAX_ADDRESS_LENGTH} characters or fewer`);
    return undefined;
  }

  return stringValue;
};

const parsePhone = (value: unknown, errors: string[], field: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return undefined;
    }

    if (!PHONE_REGEX.test(trimmed)) {
      errors.push(`${field} must be a valid phone number`);
      return undefined;
    }

    return trimmed;
  }

  errors.push(`${field} must be a string`);
  return undefined;
};

const parseEmergencyContact = (
  value: unknown,
  errors: string[]
): SanitisedEmergencyContact | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'object') {
    errors.push('emergencyContact must be an object');
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const name = parseName(raw.name, 'emergencyContact.name', errors);
  const phone = parsePhone(raw.phone, errors, 'emergencyContact.phone');
  const relationship = sanitiseString(raw.relationship);

  if (!name || !phone) {
    return undefined;
  }

  if (relationship && relationship.length > MAX_NAME_LENGTH) {
    errors.push('emergencyContact.relationship must be 100 characters or fewer');
    return undefined;
  }

  const contact: SanitisedEmergencyContact = {
    name,
    phone,
  };

  if (relationship) {
    contact.relationship = relationship;
  }

  return contact;
};

const parseNullablePhoneForUpdate = (
  value: unknown,
  errors: string[],
  field: string
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return null;
    }

    if (!PHONE_REGEX.test(trimmed)) {
      errors.push(`${field} must be a valid phone number`);
      return undefined;
    }

    return trimmed;
  }

  errors.push(`${field} must be a string or null`);
  return undefined;
};

export const sanitiseCreateClientPayload = (input: CreateClientRequest): ValidationResult => {
  const errors: string[] = [];

  const firstName = parseName(input.firstName, 'firstName', errors);
  const lastName = parseName(input.lastName, 'lastName', errors);
  const dateOfBirth = parseDateOfBirth(input.dateOfBirth, errors);
  const address = parseAddress(input.address, errors);
  const phone = parsePhone(input.phone, errors, 'phone');
  const emergencyContact = parseEmergencyContact(input.emergencyContact, errors);

  if (errors.length > 0 || !firstName || !lastName || !dateOfBirth || !address) {
    return { ok: false, errors };
  }

  const payload: SanitisedCreateClientPayload = {
    firstName,
    lastName,
    dateOfBirth,
    address,
  };

  if (phone) {
    payload.phone = phone;
  }

  if (emergencyContact) {
    payload.emergencyContact = emergencyContact;
  }

  return {
    ok: true,
    value: payload,
  };
};

export const sanitiseUpdateClientPayload = (input: unknown): UpdateValidationResult => {
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      errors: ['Request body must be an object'],
    };
  }

  const raw = input as UpdateClientRequest;
  const errors: string[] = [];
  const payload: SanitisedUpdateClientPayload = {};
  let hasUpdatableField = false;

  if (Object.prototype.hasOwnProperty.call(raw, 'firstName')) {
    hasUpdatableField = true;
    const firstName = parseName(raw.firstName, 'firstName', errors);
    if (firstName) {
      payload.firstName = firstName;
    }
  }

  if (Object.prototype.hasOwnProperty.call(raw, 'lastName')) {
    hasUpdatableField = true;
    const lastName = parseName(raw.lastName, 'lastName', errors);
    if (lastName) {
      payload.lastName = lastName;
    }
  }

  if (Object.prototype.hasOwnProperty.call(raw, 'dateOfBirth')) {
    hasUpdatableField = true;
    const dateOfBirth = parseDateOfBirth(raw.dateOfBirth, errors);
    if (dateOfBirth) {
      payload.dateOfBirth = dateOfBirth;
    }
  }

  if (Object.prototype.hasOwnProperty.call(raw, 'address')) {
    hasUpdatableField = true;
    const address = parseAddress(raw.address, errors);
    if (address) {
      payload.address = address;
    }
  }

  if (Object.prototype.hasOwnProperty.call(raw, 'phone')) {
    hasUpdatableField = true;
    const phone = parseNullablePhoneForUpdate(raw.phone, errors, 'phone');
    if (phone !== undefined) {
      payload.phone = phone;
    }
  }

  if (Object.prototype.hasOwnProperty.call(raw, 'emergencyContact')) {
    hasUpdatableField = true;
    const contactValue = raw.emergencyContact;

    if (contactValue === null) {
      payload.emergencyContact = null;
    } else {
      const beforeErrors = errors.length;
      const contact = parseEmergencyContact(contactValue, errors);

      if (errors.length === beforeErrors) {
        if (contact) {
          payload.emergencyContact = contact;
        } else {
          errors.push('emergencyContact must include name and phone');
        }
      }
    }
  }

  if (!hasUpdatableField) {
    errors.push('At least one updatable field must be provided');
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: payload,
  };
};

export type { ValidationResult };
