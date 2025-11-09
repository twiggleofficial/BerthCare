export type SyncStatus = 'synced' | 'pending' | 'conflict';

export type SyncQueueOperation = 'create' | 'update' | 'delete';
export type SyncQueuePriority = 'critical' | 'normal';

export type VisitStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'invalid_timing';

export type VitalSigns = {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
};

export type VisitActivities = {
  personalCare: boolean;
  medication: boolean;
  mealPreparation: boolean;
  mobility: boolean;
  other?: string;
};
