import packageJson from '../package.json' with { type: 'json' };
export const projectMetadata = {
    service: 'berthcare-api',
    displayName: 'BerthCare',
    version: packageJson.version,
    maintainers: ['platform@berthcare.ca'],
};
export const getSupportContact = () => {
    return 'support@berthcare.ca';
};
