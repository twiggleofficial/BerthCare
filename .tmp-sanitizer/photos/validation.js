'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.sanitisePhotoUploadPayload = void 0;
const allowedCodecs = ['jpeg', 'heic', 'webp', 'png'];
const isNonNegativeNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const parseOptionalNumber = (value, errors, fieldPath) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (isNonNegativeNumber(value)) {
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
const parseCapturedAt = (value, errors) => {
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
const parseCompression = (value, errors, basePath) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'object') {
    errors.push(`${basePath} must be an object`);
    return undefined;
  }
  const raw = value;
  const codecRaw = raw.codec;
  let codec;
  if (typeof codecRaw === 'string' && allowedCodecs.includes(codecRaw)) {
    codec = codecRaw;
  } else {
    errors.push(`${basePath}.codec must be one of ${allowedCodecs.join(', ')}`);
  }
  const quality = parseOptionalNumber(raw.quality, errors, `${basePath}.quality`);
  let resolvedQuality;
  if (quality !== undefined) {
    if (quality < 0 || quality > 100) {
      errors.push(`${basePath}.quality must be between 0 and 100`);
    } else {
      resolvedQuality = quality;
    }
  }
  const originalBytes = parseOptionalNumber(raw.originalBytes, errors, `${basePath}.originalBytes`);
  let resolvedOriginalBytes;
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
  let resolvedCompressedBytes;
  if (compressedBytes !== undefined) {
    if (compressedBytes > 0) {
      resolvedCompressedBytes = compressedBytes;
    } else {
      errors.push(`${basePath}.compressedBytes must be a positive number greater than 0`);
    }
  }
  const width = parseOptionalNumber(raw.width, errors, `${basePath}.width`);
  let resolvedWidth;
  if (width !== undefined) {
    if (width > 0) {
      resolvedWidth = width;
    } else {
      errors.push(`${basePath}.width must be a positive number greater than 0`);
    }
  }
  const height = parseOptionalNumber(raw.height, errors, `${basePath}.height`);
  let resolvedHeight;
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
  const compression = {
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
const parseMetadata = (value, errors) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'object') {
    errors.push('metadata must be an object');
    return undefined;
  }
  const raw = value;
  const metadata = {};
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
const sanitisePhotoUploadPayload = (body) => {
  const errors = [];
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
exports.sanitisePhotoUploadPayload = sanitisePhotoUploadPayload;
