/**
 * Motion tokens from design-documentation/design-system/tokens/motion.md.
 * Motion stays invisible so caregivers feel instant feedback without waiting.
 */
const durations = {
  instant: 80,
  quick: 150,
  standard: 250,
  deliberate: 400,
} as const;

const easing = {
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  emphasized: [0, 0, 0.2, 1] as [number, number, number, number],
  accelerate: [0.4, 0, 1, 1] as [number, number, number, number],
  sharp: [0.4, 0, 0.6, 1] as [number, number, number, number],
  bounce: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
} as const;

type EasingKey = keyof typeof easing;

export const motion = {
  durations,
  easing,
  interactions: {
    buttonPress: {
      scale: { from: 1, to: 0.96 },
      duration: durations.instant,
      easing: 'sharp',
    },
    toggle: {
      translateX: { from: 0, to: 20 },
      duration: durations.quick,
      easing: 'sharp',
    },
    checkbox: {
      opacity: { from: 0, to: 1 },
      scale: { from: 0.8, to: 1 },
      duration: durations.quick,
      easing: 'emphasized',
    },
  },
  transitions: {
    screenForward: {
      entering: {
        translateX: { from: 100, to: 0 },
        opacity: { from: 0.8, to: 1 },
        duration: durations.standard,
        easing: 'emphasized',
      },
      exiting: {
        translateX: { from: 0, to: -30 },
        opacity: { from: 1, to: 0.4 },
        duration: durations.standard,
        easing: 'accelerate',
      },
    },
    screenBack: {
      entering: {
        translateX: { from: -30, to: 0 },
        opacity: { from: 0.4, to: 1 },
        duration: durations.standard,
        easing: 'emphasized',
      },
      exiting: {
        translateX: { from: 0, to: 100 },
        opacity: { from: 1, to: 0.8 },
        duration: durations.standard,
        easing: 'accelerate',
      },
    },
    bottomSheet: {
      translateY: { from: 100, to: 0 },
      backdropOpacity: { from: 0, to: 1 },
      duration: durations.standard,
      easing: 'emphasized',
    },
  },
} as const;

export type MotionTokens = typeof motion;
