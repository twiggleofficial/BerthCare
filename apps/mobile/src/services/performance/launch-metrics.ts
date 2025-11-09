import { trackAnalyticsEvent } from '../analytics';

const LAUNCH_TARGET_MS = 2000;
const PERFORMANCE_REQUIREMENT_NOTE =
  'project-documentation/architecture-output.md – Performance Requirements (<2s app launch)';

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const launchStartMs = now();

type LaunchMetrics = {
  durationMs: number;
  targetMs: number;
  metTarget: boolean;
  requirement: string;
};

let recordedMetrics: LaunchMetrics | null = null;

/**
 * Records the moment the UI thread becomes interactive so we can confirm the
 * architecture doc's <2s cold launch requirement is met on device.
 */
export const recordAppLaunchReady = async (): Promise<LaunchMetrics> => {
  if (recordedMetrics) {
    return recordedMetrics;
  }

  const durationMs = Math.round(now() - launchStartMs);

  recordedMetrics = {
    durationMs,
    targetMs: LAUNCH_TARGET_MS,
    metTarget: durationMs <= LAUNCH_TARGET_MS,
    requirement: PERFORMANCE_REQUIREMENT_NOTE,
  };

  await trackAnalyticsEvent({
    name: 'app_launch_ready',
    properties: {
      ...recordedMetrics,
      timestamp: new Date().toISOString(),
    },
  });

  return recordedMetrics;
};

