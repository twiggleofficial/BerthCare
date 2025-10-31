import { summarizeCarePlan } from '@berthcare/shared-care-plan';

describe('summarizeCarePlan', () => {
  it('returns a readable summary', () => {
    const summary = summarizeCarePlan({
      id: 'plan-1',
      title: 'Post-operative support',
      isActive: true,
    });

    expect(summary).toBe('Post-operative support (active)');
  });

  it('returns a readable summary for inactive plans', () => {
    const summary = summarizeCarePlan({
      id: 'plan-2',
      title: 'Discharge follow-up',
      isActive: false,
    });

    expect(summary).toBe('Discharge follow-up (inactive)');
  });
});
