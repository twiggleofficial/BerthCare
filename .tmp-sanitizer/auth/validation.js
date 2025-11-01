'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.sanitiseLogoutPayload =
  exports.sanitiseRefreshPayload =
  exports.sanitiseLoginPayload =
  exports.sanitiseRegistrationPayload =
    void 0;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /\d/;
const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const sanitiseString = (value) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
const validatePassword = (password, errors) => {
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
const sanitiseRegistrationPayload = (body) => {
  const errors = [];
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
  let zoneId;
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
exports.sanitiseRegistrationPayload = sanitiseRegistrationPayload;
const sanitiseLoginPayload = (body) => {
  const errors = [];
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
exports.sanitiseLoginPayload = sanitiseLoginPayload;
const sanitiseRefreshPayload = (body) => {
  const errors = [];
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
exports.sanitiseRefreshPayload = sanitiseRefreshPayload;
const sanitiseLogoutPayload = (body) => (0, exports.sanitiseRefreshPayload)(body);
exports.sanitiseLogoutPayload = sanitiseLogoutPayload;
