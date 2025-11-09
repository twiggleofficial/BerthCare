import appConfig from '../../app.json';

type ExpoAppConfig = {
  expo?: {
    version?: string;
    name?: string;
  };
};

const config = appConfig as ExpoAppConfig;

export const APP_VERSION = config.expo?.version ?? '0.0.0';
export const APP_NAME = config.expo?.name ?? 'BerthCare';
