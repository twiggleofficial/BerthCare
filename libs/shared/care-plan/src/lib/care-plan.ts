export type CarePlan = {
  id: string;
  title: string;
  isActive: boolean;
};

export const summarizeCarePlan = (plan: CarePlan): string => {
  const status = plan.isActive ? 'active' : 'inactive';
  return `${plan.title} (${status})`;
};
