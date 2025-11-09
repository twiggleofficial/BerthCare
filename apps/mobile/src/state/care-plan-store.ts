import { create } from 'zustand';

export type CareTask = {
  id: string;
  label: string;
  isComplete: boolean;
  durationMinutes: number;
  category: 'Vitals' | 'Meds' | 'Notes';
};

type CarePlanState = {
  caregiverName: string;
  activeShiftName: string;
  upcomingVisit: {
    window: string;
    location: string;
  };
  tasks: CareTask[];
  toggleTask: (taskId: string) => void;
};

const initialTasks: CareTask[] = [
  {
    id: 'vitals',
    label: 'Capture vitals & oxygen levels',
    isComplete: false,
    durationMinutes: 4,
    category: 'Vitals',
  },
  {
    id: 'meds',
    label: 'Confirm 08:00 meds with family',
    isComplete: false,
    durationMinutes: 3,
    category: 'Meds',
  },
  {
    id: 'notes',
    label: 'Leave audio note for coordinator',
    isComplete: false,
    durationMinutes: 2,
    category: 'Notes',
  },
];

export const useCarePlanStore = create<CarePlanState>((set) => ({
  caregiverName: 'Avery',
  activeShiftName: 'Sunrise Comfort Round',
  upcomingVisit: {
    window: '08:30 - 09:15',
    location: 'Maple Grove Residence',
  },
  tasks: initialTasks,
  toggleTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, isComplete: !task.isComplete } : task,
      ),
    })),
}));
