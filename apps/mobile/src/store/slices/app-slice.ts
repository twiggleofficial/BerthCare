import type { AppStateCreator, CoreAppSlice } from '../types';

export const createAppSlice: AppStateCreator<CoreAppSlice> = (set, get) => ({
  currentVisit: null,
  setCurrentVisit: (visit) => {
    const { currentVisit } = get();
    const isSameReference = currentVisit === visit;
    const isSameVisit = Boolean(currentVisit && visit && currentVisit.id === visit.id);

    if (isSameReference || isSameVisit) {
      return;
    }

    set({ currentVisit: visit });
  },
});
