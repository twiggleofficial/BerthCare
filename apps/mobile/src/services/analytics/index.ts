import type { BiometricSupport } from '../device/biometrics';

type LaunchRequirementEventProps = {
  durationMs?: number;
  targetMs?: number;
  metTarget?: boolean;
  requirement?: string;
  timestamp?: string;
};

type AnalyticsEventName =
  | 'app_launch_ready'
  | 'app_launch_requirement_failed'
  | 'database_write_latency'
  | 'activation_screen_view'
  | 'activation_code_submit'
  | 'activation_success'
  | 'activation_error'
  | 'biometric_setup_view'
  | 'biometric_enable_submit'
  | 'biometric_offline_pin_persist_error'
  | 'biometric_enrollment_success'
  | 'biometric_enrollment_error';

type AnalyticsEventPropertiesMap = {
  app_launch_ready: LaunchRequirementEventProps;
  app_launch_requirement_failed: LaunchRequirementEventProps;
  database_write_latency: {
    entity: string;
    operation: 'insert' | 'update' | 'delete' | 'bulk';
    durationMs: number;
    rowsAffected?: number;
    schemaVersion: number;
    thresholdMs: number;
    timestamp: string;
  };
  activation_screen_view: { source?: string; emailPrefilled?: boolean };
  activation_code_submit: { attempt?: number; emailDomain?: string | null };
  activation_success: { attempts?: number; durationMs?: number };
  activation_error: {
    reason?: string;
    code?: string;
    attempts?: number;
    emailDomain?: string | null;
  };
  biometric_setup_view: {
    available?: boolean;
    enrolled?: boolean;
    primaryType?: BiometricSupport['primaryType'];
  };
  biometric_enable_submit: { supportsBiometric: boolean };
  biometric_offline_pin_persist_error: { supportsBiometric: boolean };
  biometric_enrollment_success: { supportsBiometric: boolean };
  biometric_enrollment_error: { supportsBiometric: boolean; code?: string };
};

type AnalyticsEventPayload<Name extends AnalyticsEventName> = {
  name: Name;
  properties?: AnalyticsEventPropertiesMap[Name];
};

const SENSITIVE_KEYS = new Set(['email', 'phone', 'phonenumber', 'firstname', 'lastname', 'fullname', 'id']);

const sanitizeProperties = <T extends Record<string, unknown> | undefined>(properties: T): T => {
  if (!properties) {
    return properties;
  }

  const sanitized: Record<string, unknown> = { ...properties };
  Object.keys(sanitized).forEach((key) => {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      delete sanitized[key];
    }
  });
  return sanitized as T;
};

const logToConsole = (
  name: AnalyticsEventName,
  properties?: AnalyticsEventPropertiesMap[AnalyticsEventName],
) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console -- placeholder until analytics vendor integration
    console.log('[analytics]', name, properties ?? {});
  }
};

const sendAnalyticsEvent = async <Name extends AnalyticsEventName>({
  name,
  properties,
}: AnalyticsEventPayload<Name>) => {
  logToConsole(name, properties);
  // Placeholder for future vendor SDK (Segment, RudderStack, etc.)
  return Promise.resolve();
};

export const trackAnalyticsEvent = async <Name extends AnalyticsEventName>(
  event: AnalyticsEventPayload<Name>,
) => {
  // Never pass raw user/profile objects. Sensitive keys are stripped as a safeguard.
  const sanitizedEvent: AnalyticsEventPayload<Name> = {
    ...event,
    properties: sanitizeProperties(event.properties),
  };

  try {
    await sendAnalyticsEvent(sanitizedEvent);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console -- Developer visibility only
      console.warn('[analytics] failed to record event', sanitizedEvent.name, error);
    }
  }
};
