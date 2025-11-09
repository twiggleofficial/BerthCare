import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Respects the WCAG 2.1 reduced-motion preference noted in
 * design-documentation/accessibility/wcag-compliance.md so interactions stay
 * comfortable for caregivers with vestibular sensitivities.
 */
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPreference = async () => {
      try {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        if (isMounted) {
          setPrefersReducedMotion(enabled);
        }
      } catch (error) {
        console.warn('Failed to read reduce-motion preference', error);
      }
    };

    void loadPreference();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (isMounted) {
          setPrefersReducedMotion(enabled);
        }
      },
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return prefersReducedMotion;
};
