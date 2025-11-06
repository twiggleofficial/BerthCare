import packageJson from '../package.json' with { type: 'json' };

export interface ProjectMetadata {
  service: string;
  displayName: string;
  version: string;
  maintainers: string[];
}

export const projectMetadata: ProjectMetadata = {
  service: 'berthcare-api',
  displayName: 'BerthCare',
  version: packageJson.version,
  maintainers: ['platform@berthcare.ca'],
};

export const getSupportContact = (): string => {
  return 'support@berthcare.ca';
};
