import * as Device from 'expo-device';

let cachedName: string | null = null;

const buildFallbackName = () => {
  const parts = [Device.manufacturer, Device.modelName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'BerthCare Device';
};

export const getDeviceName = (): string => {
  if (cachedName) {
    return cachedName;
  }

  if (Device.deviceName) {
    cachedName = Device.deviceName;
    return cachedName;
  }

  const fallback = buildFallbackName();
  cachedName = fallback;
  return fallback;
};
