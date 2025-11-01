import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { extname } from 'node:path';

import { logger } from '../logger';
import { normaliseExtension, parseBoolean, parseInteger } from 'libs/utils/parse';

const DEFAULT_REGION = 'ca-central-1';
const DEFAULT_BUCKET = 'berthcare-local';
const DEFAULT_PRESIGNED_TTL_SECONDS = 15 * 60;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export type PhotoCompressionMetadata = {
  codec: 'jpeg' | 'heic' | 'webp' | 'png';
  quality?: number;
  originalBytes?: number;
  compressedBytes?: number;
  width?: number;
  height?: number;
};

export type PhotoMetadataInput = {
  visitId: string;
  caregiverId?: string;
  capturedAt?: Date | string;
  deviceModel?: string;
  checksumSha256?: string;
  compression?: PhotoCompressionMetadata;
};

export type PhotoKeyOptions = {
  visitId: string;
  extension: string;
  capturedAt?: Date | string;
};

export type GeneratePhotoUploadUrlInput = {
  fileName: string;
  contentType: string;
  visitId: string;
  caregiverId?: string;
  metadata?: Omit<PhotoMetadataInput, 'visitId'>;
  expiresInSeconds?: number;
  bucket?: string;
};

export type GeneratePhotoUploadUrlResult = {
  uploadUrl: string;
  photoKey: string;
  bucket: string;
  expiresInSeconds: number;
  expiresAt: string;
};

export type StorageHealth = {
  healthy: boolean;
  bucket: string;
  region: string;
  error?: string;
};

let s3Client: S3Client | undefined;

const resolveRegion = (): string => process.env.AWS_REGION ?? DEFAULT_REGION;

const resolveBucket = (override?: string): string =>
  override ?? process.env.AWS_S3_PHOTO_BUCKET ?? process.env.AWS_S3_BUCKET ?? DEFAULT_BUCKET;

const resolvePresignedTtl = (override?: number): number => {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return override;
  }

  return parseInteger(process.env.S3_PRESIGNED_TTL_SECONDS, DEFAULT_PRESIGNED_TTL_SECONDS, {
    min: 60,
  });
};

const buildS3Config = (): S3ClientConfig => {
  const region = resolveRegion();
  const forcePathStyle = parseBoolean(process.env.S3_FORCE_PATH_STYLE, false);
  const endpoint = process.env.S3_ENDPOINT;
  const requestTimeout = parseInteger(
    process.env.S3_REQUEST_TIMEOUT_MS,
    DEFAULT_REQUEST_TIMEOUT_MS,
    { min: 1000 }
  );
  const maxAttempts = parseInteger(process.env.S3_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS, {
    min: 1,
    max: 10,
  });

  const config: S3ClientConfig = {
    region,
    maxAttempts,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: requestTimeout,
      requestTimeout,
    }),
  };

  if (endpoint) {
    config.endpoint = endpoint;
  }

  if (forcePathStyle) {
    config.forcePathStyle = true;
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    logger.warn('AWS credentials not found in environment; relying on default provider chain');
  }

  return config;
};

const ensureS3Client = (): S3Client => {
  if (!s3Client) {
    const config = buildS3Config();
    s3Client = new S3Client(config);

    logger.info('S3 client initialised', {
      region: config.region,
      endpoint: config.endpoint ?? 'aws',
      forcePathStyle: config.forcePathStyle === true,
    });
  }

  return s3Client;
};

export const getS3Client = (): S3Client => ensureS3Client();

export const buildPhotoStorageKey = ({
  visitId,
  extension,
  capturedAt,
}: PhotoKeyOptions): string => {
  const normalisedExtension = normaliseExtension(extension);
  const safeVisitId = visitId.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
  if (!safeVisitId) {
    throw new Error('Invalid visitId: value must contain at least one safe character');
  }

  let timestampDate: Date;
  if (capturedAt instanceof Date || typeof capturedAt === 'string') {
    const candidate = capturedAt instanceof Date ? capturedAt : new Date(capturedAt);

    if (Number.isNaN(candidate.getTime())) {
      logger.warn('Invalid capturedAt provided for photo key; falling back to current time', {
        capturedAt,
        visitId: safeVisitId,
      });
      timestampDate = new Date();
    } else {
      timestampDate = candidate;
    }
  } else {
    timestampDate = new Date();
  }

  const timestamp = timestampDate.toISOString();

  const suffix = normalisedExtension ? `.${normalisedExtension}` : '';
  return `visits/${safeVisitId}/${timestamp}-${randomUUID()}${suffix}`;
};

const buildPhotoMetadata = (
  visitId: string,
  metadata?: Omit<PhotoMetadataInput, 'visitId'>
): Record<string, string> => {
  const result: Record<string, string> = {
    visit_id: visitId,
  };

  if (!metadata) {
    return result;
  }

  if (metadata.caregiverId) {
    result.caregiver_id = metadata.caregiverId;
  }

  if (metadata.capturedAt) {
    const capturedAt =
      metadata.capturedAt instanceof Date ? metadata.capturedAt : new Date(metadata.capturedAt);

    if (Number.isNaN(capturedAt.getTime())) {
      logger.warn('Invalid capturedAt metadata provided; skipping captured_at field', {
        capturedAt: metadata.capturedAt,
        visitId,
      });
    } else {
      result.captured_at = capturedAt.toISOString();
    }
  }

  if (metadata.deviceModel) {
    result.device_model = metadata.deviceModel;
  }

  if (metadata.checksumSha256) {
    result.checksum_sha256 = metadata.checksumSha256;
  }

  if (metadata.compression) {
    const { codec, quality, originalBytes, compressedBytes, width, height } = metadata.compression;
    result.compression_codec = codec;

    if (typeof quality === 'number') {
      result.compression_quality = quality.toString();
    }

    if (typeof originalBytes === 'number') {
      result.original_bytes = originalBytes.toString();
    }

    if (typeof compressedBytes === 'number') {
      result.compressed_bytes = compressedBytes.toString();
    }

    if (typeof width === 'number') {
      result.image_width = width.toString();
    }

    if (typeof height === 'number') {
      result.image_height = height.toString();
    }

    if (
      typeof originalBytes === 'number' &&
      typeof compressedBytes === 'number' &&
      compressedBytes > 0
    ) {
      const ratio = originalBytes / compressedBytes;
      result.compression_ratio = ratio.toFixed(2);
    }
  }

  return result;
};

export const generatePhotoUploadUrl = async ({
  fileName,
  contentType,
  visitId,
  caregiverId,
  metadata,
  expiresInSeconds,
  bucket,
}: GeneratePhotoUploadUrlInput): Promise<GeneratePhotoUploadUrlResult> => {
  const client = ensureS3Client();
  const resolvedBucket = resolveBucket(bucket);

  const rawExtension = extname(fileName);
  const extension = rawExtension && rawExtension !== '.' ? rawExtension.slice(1) : '';
  const photoKey = buildPhotoStorageKey({
    visitId,
    extension,
    capturedAt: metadata?.capturedAt,
  });

  const ttl = resolvePresignedTtl(expiresInSeconds);

  const command = new PutObjectCommand({
    Bucket: resolvedBucket,
    Key: photoKey,
    ContentType: contentType,
    Metadata: buildPhotoMetadata(visitId, {
      ...metadata,
      caregiverId,
    }),
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: ttl });

  return {
    uploadUrl,
    photoKey,
    bucket: resolvedBucket,
    expiresInSeconds: ttl,
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
  };
};

export const checkPhotoBucketHealth = async (): Promise<StorageHealth> => {
  const client = ensureS3Client();
  const bucket = resolveBucket();
  const region = resolveRegion();

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return {
      healthy: true,
      bucket,
      region,
    };
  } catch (error) {
    const err = error as Error;

    logger.warn('S3 head bucket failed', {
      bucket,
      message: err.message,
    });

    return {
      healthy: false,
      bucket,
      region,
      error: err.message,
    };
  }
};

export const resetS3Client = (): void => {
  if (s3Client) {
    s3Client.destroy();
    s3Client = undefined;
  }
};
