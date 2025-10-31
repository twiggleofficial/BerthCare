import { summarizeCarePlan } from '@berthcare/shared-care-plan';

describe('summarizeCarePlan', () => {
  it('returns a readable summary', () => {
    const summary = summarizeCarePlan({
      id: 'plan-1',
      title: 'Post-operative support',
      isActive: true
    });

    expect(summary).toBe('Post-operative support (active)');
  });
});
