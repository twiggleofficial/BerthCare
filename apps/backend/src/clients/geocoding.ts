const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const DEFAULT_TIMEOUT_MS = 7_000;

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

export type GeocodingErrorCode =
  | 'config_error'
  | 'zero_results'
  | 'invalid_response'
  | 'request_failed';

export class GeocodingError extends Error {
  readonly code: GeocodingErrorCode;

  constructor(message: string, code: GeocodingErrorCode) {
    super(message);
    this.name = 'GeocodingError';
    this.code = code;
  }
}

type GeocodeApiResult = {
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};

type GeocodeApiResponse = {
  status: string;
  results?: GeocodeApiResult[];
};

const buildUrl = (address: string, apiKey: string): string => {
  const params = new URLSearchParams({
    address,
    key: apiKey,
  });

  const url = `${GEOCODE_ENDPOINT}?${params.toString()}`;
  // Google APIs expect spaces encoded as '+'
  return url.replace(/%20/g, '+');
};

const resolveTimeout = (): number => {
  const raw = process.env.GOOGLE_MAPS_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return parsed;
};

export const geocodeAddress = async (address: string): Promise<GeocodeResult> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new GeocodingError('Google Maps API key is not configured', 'config_error');
  }

  const timeoutMs = resolveTimeout();
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildUrl(address, apiKey), {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new GeocodingError(
        `Geocoding request failed with status ${response.status}`,
        'request_failed'
      );
    }

    const body = (await response.json()) as GeocodeApiResponse;

    if (!body || typeof body.status !== 'string') {
      throw new GeocodingError('Invalid geocoding response structure', 'invalid_response');
    }

    if (body.status === 'ZERO_RESULTS') {
      throw new GeocodingError(
        'No geocoding results found for the provided address',
        'zero_results'
      );
    }

    if (body.status !== 'OK') {
      throw new GeocodingError(`Geocoding returned error status: ${body.status}`, 'request_failed');
    }

    const [firstResult] = body.results ?? [];

    if (!firstResult?.geometry?.location) {
      throw new GeocodingError('Geocoding result missing location data', 'invalid_response');
    }

    const { lat, lng } = firstResult.geometry.location;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new GeocodingError('Geocoding coordinates must be numbers', 'invalid_response');
    }

    return {
      latitude: lat,
      longitude: lng,
      formattedAddress: firstResult.formatted_address ?? address,
    };
  } catch (error) {
    if (error instanceof GeocodingError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new GeocodingError('Geocoding request timed out', 'request_failed');
    }

    throw new GeocodingError(
      error instanceof Error ? error.message : 'Unknown geocoding error',
      'request_failed'
    );
  } finally {
    clearTimeout(timeoutHandle);
  }
};
