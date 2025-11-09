type AnalyticsEventName =
  | 'app_launch_ready'
  | 'activation_screen_view'
  | 'activation_code_submit'
  | 'activation_success'
  | 'activation_error'
  | 'biometric_setup_view'
  | 'biometric_enable_submit'
  | 'biometric_enrollment_success'
  | 'biometric_enrollment_error';

type AnalyticsEventPayload<Name extends AnalyticsEventName> = {
  name: Name;
  properties?: Record<string, unknown>;
};

const logToConsole = (name: AnalyticsEventName, properties?: Record<string, unknown>) => {
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
  try {
    await sendAnalyticsEvent(event);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console -- Developer visibility only
      console.warn('[analytics] failed to record event', event.name, error);
    }
  }
};
