import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/**
 * Mirrors the caregiver-first saving cadence documented in
 * `project-documentation/architecture-output.md` (Auto-Save Logic +
 * “Auto-Save over Manual Save”). Changes debounce for 1 second, but also flush
 * immediately on blur, navigation, or when the app backgrounds.
 */
export type AutoSaveReason = 'debounce' | 'blur' | 'navigation' | 'background' | 'manual';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'error';

type UseAutoSaveOptions<T> = {
  initialValues: T;
  save: (values: T, meta: { reason: AutoSaveReason }) => Promise<void>;
  debounceMs?: number;
  navigation?: NavigationProp<ParamListBase>;
  enabled?: boolean;
  resetKey?: string | number;
  initialLastSavedAt?: Date | null;
  onError?: (error: unknown) => void;
};

export type UseAutoSaveReturn<T> = {
  values: T;
  setValues: React.Dispatch<React.SetStateAction<T>>;
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  isDirty: boolean;
  handleBlur: () => void;
  triggerSave: (reason?: AutoSaveReason) => Promise<void>;
};

const createStableSerializer = <T,>() =>
  (value: T): string => {
    try {
      return JSON.stringify(value ?? null);
    } catch {
      return String(value);
    }
  };

export function useAutoSave<T>({
  initialValues,
  save,
  debounceMs = 1000,
  navigation,
  enabled = true,
  resetKey = 'default',
  initialLastSavedAt = null,
  onError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const serializer = useMemo(() => createStableSerializer<T>(), []);
  const [values, setValues] = useState<T>(initialValues);
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(initialLastSavedAt);
  const [isDirty, setIsDirty] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isSavingRef = useRef(false);
  const pendingReasonRef = useRef<AutoSaveReason | null>(null);
  const resetKeyRef = useRef(resetKey);
  const lastCommittedRef = useRef(serializer(initialValues));
  const pendingSnapshotRef = useRef(initialValues);
  const isDirtyRef = useRef(false);

  const clearPendingTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hasSnapshotChanged = useCallback(
    (prev: T, next: T) => serializer(prev) !== serializer(next),
    [serializer],
  );

  // Rehydrate form state when a new record (resetKey) is loaded.
  useEffect(() => {
    if (resetKeyRef.current === resetKey && !hasSnapshotChanged(pendingSnapshotRef.current, initialValues)) {
      return;
    }

    resetKeyRef.current = resetKey;
    lastCommittedRef.current = serializer(initialValues);
    pendingSnapshotRef.current = initialValues;
    isDirtyRef.current = false;
    setValues(initialValues);
    setStatus('idle');
    setIsDirty(false);
    setLastSavedAt(initialLastSavedAt);
  }, [hasSnapshotChanged, initialLastSavedAt, initialValues, resetKey, serializer]);

  const triggerSave = useCallback(
    async (reason: AutoSaveReason = 'manual') => {
      if (!enabled) {
        return;
      }

      clearPendingTimer();

      if (!isDirtyRef.current) {
        return;
      }

      if (isSavingRef.current) {
        pendingReasonRef.current = reason;
        return;
      }

      isSavingRef.current = true;
      if (isMountedRef.current) {
        setStatus('saving');
      }

      const snapshot = pendingSnapshotRef.current;
      try {
        await save(snapshot, { reason });
        lastCommittedRef.current = serializer(snapshot);
        isDirtyRef.current = false;
        if (isMountedRef.current) {
          setIsDirty(false);
          setStatus('idle');
          setLastSavedAt(new Date());
        }
      } catch (error) {
        if (isMountedRef.current) {
          setStatus('error');
        }
        onError?.(error);
      } finally {
        isSavingRef.current = false;
        const pendingReason = pendingReasonRef.current;
        pendingReasonRef.current = null;
        if (pendingReason) {
          void triggerSave(pendingReason);
        }
      }
    },
    [clearPendingTimer, enabled, onError, save, serializer],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearPendingTimer();
      if (enabled) {
        void triggerSave('navigation');
      }
    };
  }, [clearPendingTimer, enabled, triggerSave]);

  // 1-second debounce for normal field changes.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const serialized = serializer(values);
    if (serialized === lastCommittedRef.current) {
      return;
    }

    pendingSnapshotRef.current = values;
    isDirtyRef.current = true;
    setIsDirty(true);
    setStatus((current) => (current === 'error' ? current : 'pending'));

    clearPendingTimer();
    timerRef.current = setTimeout(() => {
      void triggerSave('debounce');
    }, debounceMs);
  }, [values, debounceMs, enabled, serializer, triggerSave, clearPendingTimer]);

  // Flush when app backgrounds — mirrors the architecture blueprint.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        void triggerSave('background');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [enabled, triggerSave]);

  // Flush when navigators remove or blur the screen.
  useEffect(() => {
    if (!enabled || !navigation) {
      return;
    }

    const removeListener = navigation.addListener('beforeRemove', () => {
      void triggerSave('navigation');
    });
    const blurListener = navigation.addListener('blur', () => {
      void triggerSave('navigation');
    });

    return () => {
      removeListener();
      blurListener();
    };
  }, [enabled, navigation, triggerSave]);

  const handleBlur = useCallback(() => {
    void triggerSave('blur');
  }, [triggerSave]);

  return {
    values,
    setValues,
    status,
    lastSavedAt,
    isDirty,
    handleBlur,
    triggerSave,
  };
}
