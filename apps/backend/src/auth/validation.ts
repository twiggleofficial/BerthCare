export type RegistrationRequestBody = {
  email?: unknown;
  password?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  zoneId?: unknown;
  deviceId?: unknown;
};

export type LoginRequestBody = {
  email?: unknown;
  password?: unknown;
  deviceId?: unknown;
};

export type RefreshRequestBody = {
  refreshToken?: unknown;
};

export type LogoutRequestBody = RefreshRequestBody;

export type SanitisedRegistrationPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  zoneId: string;
  deviceId: string;
};

export type SanitisedLoginPayload = {
  email: string;
  password: string;
  deviceId: string;
};

export type SanitisedRefreshPayload = {
  refreshToken: string;
};

export type SanitisedLogoutPayload = SanitisedRefreshPayload;

export type RegistrationValidationResult =
  | { ok: true; value: SanitisedRegistrationPayload }
  | { ok: false; errors: string[] };

export type LoginValidationResult =
  | { ok: true; value: SanitisedLoginPayload }
  | { ok: false; errors: string[] };

export type RefreshValidationResult =
  | { ok: true; value: SanitisedRefreshPayload }
  | { ok: false; errors: string[] };

export type LogoutValidationResult =
  | { ok: true; value: SanitisedLogoutPayload }
  | { ok: false; errors: string[] };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /\d/;
const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const sanitiseString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const validatePassword = (password: string, errors: string[]): void => {
  if (password.length < 8) {
    errors.push('password must be at least 8 characters long');
  }

  if (!UPPERCASE_REGEX.test(password)) {
    errors.push('password must include at least one uppercase letter');
  }

  if (!NUMBER_REGEX.test(password)) {
    errors.push('password must include at least one number');
  }
};

export const sanitiseRegistrationPayload = (
  body: RegistrationRequestBody
): RegistrationValidationResult => {
  const errors: string[] = [];

  const email = sanitiseString(body.email);
  if (!email) {
    errors.push('email is required');
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('email must be a valid email address');
  }

  const password = sanitiseString(body.password);
  if (!password) {
    errors.push('password is required');
  } else {
    validatePassword(password, errors);
  }

  const firstName = sanitiseString(body.firstName);
  if (!firstName) {
    errors.push('firstName is required');
  }

  const lastName = sanitiseString(body.lastName);
  if (!lastName) {
    errors.push('lastName is required');
  }

  const zoneIdRaw = sanitiseString(body.zoneId);
  let zoneId: string | undefined;
  if (!zoneIdRaw) {
    errors.push('zoneId is required');
  } else if (!UUID_REGEX.test(zoneIdRaw)) {
    errors.push('zoneId must be a valid UUID');
  } else {
    zoneId = zoneIdRaw.toLowerCase();
  }

  const deviceId = sanitiseString(body.deviceId);
  if (!deviceId) {
    errors.push('deviceId is required');
  }

  if (errors.length > 0 || !email || !password || !firstName || !lastName || !zoneId || !deviceId) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      zoneId,
      deviceId,
    },
  };
};

export const sanitiseLoginPayload = (body: LoginRequestBody): LoginValidationResult => {
  const errors: string[] = [];

  const email = sanitiseString(body.email);
  if (!email) {
    errors.push('email is required');
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('email must be a valid email address');
  }

  const password = sanitiseString(body.password);
  if (!password) {
    errors.push('password is required');
  } else if (password.length < 8) {
    errors.push('password must be at least 8 characters long');
  }

  const deviceId = sanitiseString(body.deviceId);
  if (!deviceId) {
    errors.push('deviceId is required');
  }

  if (errors.length > 0 || !email || !password || !deviceId) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      email: email.toLowerCase(),
      password,
      deviceId,
    },
  };
};

export const sanitiseRefreshPayload = (body: RefreshRequestBody): RefreshValidationResult => {
  const errors: string[] = [];

  const refreshToken = sanitiseString(body.refreshToken);
  if (!refreshToken) {
    errors.push('refreshToken is required');
  }

  if (errors.length > 0 || !refreshToken) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      refreshToken,
    },
  };
};

export const sanitiseLogoutPayload = (body: LogoutRequestBody): LogoutValidationResult =>
  sanitiseRefreshPayload(body) as LogoutValidationResult;
