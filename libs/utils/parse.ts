const clampNumber = (value: number, min?: number, max?: number): number => {
  let result = value;

  if (typeof min === 'number') {
    result = Math.max(result, min);
  }

  if (typeof max === 'number') {
    result = Math.min(result, max);
  }

  return result;
};

export const parseInteger = (
  value: string | undefined,
  fallback: number,
  options: { min?: number; max?: number } = {}
): number => {
  const parsed = Number.parseInt(value ?? '', 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return clampNumber(parsed, options.min, options.max);
};

export const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') {
    return fallback;
  }

  const normalised = value.trim().toLowerCase();

  if (['true', '1', 'yes', 'y', 'on'].includes(normalised)) {
    return true;
  }

  if (['false', '0', 'no', 'n', 'off'].includes(normalised)) {
    return false;
  }

  return fallback;
};

export const normaliseExtension = (extension: unknown): string => {
  if (typeof extension !== 'string' || extension.trim() === '') {
    return '';
  }

  const trimmed = extension.trim().replace(/^\./, '');
  return trimmed.toLowerCase();
};
