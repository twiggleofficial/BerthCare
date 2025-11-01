import { type PhotoCompressionMetadata, type PhotoMetadataInput } from '../storage/s3';

export type GenerateUploadUrlRequest = {
  fileName?: unknown;
  fileType?: unknown;
  visitId?: unknown;
  caregiverId?: unknown;
  expiresInSeconds?: unknown;
  metadata?: unknown;
};

export type SanitisedUploadPayload = {
  fileName: string;
  fileType: string;
  visitId: string;
  caregiverId?: string;
  expiresInSeconds?: number;
  metadata?: Omit<PhotoMetadataInput, 'visitId'>;
};

export type ValidationResult =
  | { ok: true; value: SanitisedUploadPayload }
  | { ok: false; errors: string[] };

const allowedCodecs: PhotoCompressionMetadata['codec'][] = ['jpeg', 'heic', 'webp', 'png'];

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const parseOptionalNumber = (
  value: unknown,
  errors: string[],
  fieldPath: string
): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (isPositiveNumber(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  errors.push(`${fieldPath} must be a non-negative number`);
  return undefined;
};

const parseCapturedAt = (value: unknown, errors: string[]): Date | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      errors.push('metadata.capturedAt is an invalid date');
      return undefined;
    }

    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  errors.push('metadata.capturedAt must be an ISO 8601 date string');
  return undefined;
};

const parseCompression = (
  value: unknown,
  errors: string[],
  basePath: string
): PhotoCompressionMetadata | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'object') {
    errors.push(`${basePath} must be an object`);
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const codecRaw = raw.codec;
  const codec =
    typeof codecRaw === 'string' && allowedCodecs.includes(codecRaw as PhotoCompressionMetadata['codec'])
      ? (codecRaw as PhotoCompressionMetadata['codec'])
      : undefined;

  if (!codec) {
    errors.push(`${basePath}.codec must be one of ${allowedCodecs.join(', ')}`);
  }

  const quality = parseOptionalNumber(raw.quality, errors, `${basePath}.quality`);

  let resolvedQuality: number | undefined;
  if (quality !== undefined) {
    if (quality < 0 || quality > 100) {
      errors.push(`${basePath}.quality must be between 0 and 100`);
    } else {
      resolvedQuality = quality;
    }
  }

  const originalBytes = parseOptionalNumber(raw.originalBytes, errors, `${basePath}.originalBytes`);
  let resolvedOriginalBytes: number | undefined;
  if (originalBytes !== undefined) {
    if (originalBytes > 0) {
      resolvedOriginalBytes = originalBytes;
    } else {
      errors.push(`${basePath}.originalBytes must be a positive number greater than 0`);
    }
  }

  const compressedBytes = parseOptionalNumber(
    raw.compressedBytes,
    errors,
    `${basePath}.compressedBytes`
  );
  let resolvedCompressedBytes: number | undefined;
  if (compressedBytes !== undefined) {
    if (compressedBytes > 0) {
      resolvedCompressedBytes = compressedBytes;
    } else {
      errors.push(`${basePath}.compressedBytes must be a positive number greater than 0`);
    }
  }

  const width = parseOptionalNumber(raw.width, errors, `${basePath}.width`);
  let resolvedWidth: number | undefined;
  if (width !== undefined) {
    if (width > 0) {
      resolvedWidth = width;
    } else {
      errors.push(`${basePath}.width must be a positive number greater than 0`);
    }
  }

  const height = parseOptionalNumber(raw.height, errors, `${basePath}.height`);
  let resolvedHeight: number | undefined;
  if (height !== undefined) {
    if (height > 0) {
      resolvedHeight = height;
    } else {
      errors.push(`${basePath}.height must be a positive number greater than 0`);
    }
  }

  if (!codec) {
    return undefined;
  }

  const compression: PhotoCompressionMetadata = {
    codec,
  };

  if (resolvedQuality !== undefined) {
    compression.quality = resolvedQuality;
  }
  if (resolvedOriginalBytes !== undefined) {
    compression.originalBytes = resolvedOriginalBytes;
  }
  if (resolvedCompressedBytes !== undefined) {
    compression.compressedBytes = resolvedCompressedBytes;
  }
  if (resolvedWidth !== undefined) {
    compression.width = resolvedWidth;
  }
  if (resolvedHeight !== undefined) {
    compression.height = resolvedHeight;
  }

  return compression;
};

const parseMetadata = (
  value: unknown,
  errors: string[]
): Omit<PhotoMetadataInput, 'visitId'> | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'object') {
    errors.push('metadata must be an object');
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const metadata: Omit<PhotoMetadataInput, 'visitId'> = {};

  if (typeof raw.caregiverId === 'string' && raw.caregiverId.trim() !== '') {
    metadata.caregiverId = raw.caregiverId.trim();
  }

  if (typeof raw.deviceModel === 'string' && raw.deviceModel.trim() !== '') {
    metadata.deviceModel = raw.deviceModel.trim();
  }

  if (typeof raw.checksumSha256 === 'string' && raw.checksumSha256.trim() !== '') {
    metadata.checksumSha256 = raw.checksumSha256.trim();
  }

  const capturedAt = parseCapturedAt(raw.capturedAt, errors);
  if (capturedAt) {
    metadata.capturedAt = capturedAt;
  }

  const compression = parseCompression(raw.compression, errors, 'metadata.compression');
  if (compression) {
    metadata.compression = compression;
  }

  return metadata;
};

export const sanitisePhotoUploadPayload = (body: GenerateUploadUrlRequest): ValidationResult => {
  const errors: string[] = [];

  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const fileType = typeof body.fileType === 'string' ? body.fileType.trim() : '';
  const visitId = typeof body.visitId === 'string' ? body.visitId.trim() : '';
  const caregiverId =
    typeof body.caregiverId === 'string' && body.caregiverId.trim() !== ''
      ? body.caregiverId.trim()
      : undefined;
  const expiresInSeconds = parseOptionalNumber(body.expiresInSeconds, errors, 'expiresInSeconds');
  const metadata = parseMetadata(body.metadata, errors);

  if (!fileName) {
    errors.push('fileName is required');
  }

  if (!fileType) {
    errors.push('fileType is required');
  }

  if (!visitId) {
    errors.push('visitId is required');
  }

  if (expiresInSeconds !== undefined && (expiresInSeconds < 60 || expiresInSeconds > 3600)) {
    errors.push('expiresInSeconds must be between 60 and 3600');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      fileName,
      fileType,
      visitId,
      caregiverId,
      expiresInSeconds,
      metadata,
    },
  };
};
