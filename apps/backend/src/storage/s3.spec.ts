/**
 * @jest-environment node
 */

import { PutObjectCommand } from '@aws-sdk/client-s3';

import { buildPhotoStorageKey, generatePhotoUploadUrl, resetS3Client } from './s3';

let capturedCommand: PutObjectCommand | undefined;

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(async (_client, command) => {
    capturedCommand = command as PutObjectCommand;
    return 'https://example.com/upload';
  }),
}));

jest.mock('node:crypto', () => ({
  randomUUID: () => 'fixed-uuid',
}));

describe('S3 storage helpers', () => {
  beforeEach(() => {
    capturedCommand = undefined;
    resetS3Client();
    delete process.env.AWS_S3_PHOTO_BUCKET;
    delete process.env.S3_PRESIGNED_TTL_SECONDS;
  });

  it('buildPhotoStorageKey normalises input and uses captured timestamp', () => {
    const key = buildPhotoStorageKey({
      visitId: 'visit-123/../../../',
      extension: 'JPEG',
      capturedAt: '2025-01-02T03:04:05.000Z',
    });

    expect(key.startsWith('visits/visit-123')).toBe(true);
    expect(key.endsWith('fixed-uuid.jpeg')).toBe(true);
    expect(key).not.toContain('..');
    expect(key).not.toContain(' ');
  });

  it('generatePhotoUploadUrl returns signed URL with metadata', async () => {
    const expiresInSeconds = 900;
    const result = await generatePhotoUploadUrl({
      fileName: 'photo.heic',
      contentType: 'image/heic',
      visitId: 'visit-123',
      caregiverId: 'caregiver-789',
      metadata: {
        deviceModel: 'iPhone 15',
        checksumSha256: 'abc123',
        capturedAt: new Date('2025-01-02T03:04:05.000Z'),
        compression: {
          codec: 'heic',
          quality: 85,
          originalBytes: 2_000_000,
          compressedBytes: 1_100_000,
          width: 4032,
          height: 3024,
        },
      },
      expiresInSeconds,
    });

    expect(result.uploadUrl).toBe('https://example.com/upload');
    expect(result.bucket).toBe('berthcare-local');
    expect(result.photoKey).toMatch(/^visits\/visit-123\//);
    expect(result.expiresInSeconds).toBe(expiresInSeconds);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());

    expect(capturedCommand).toBeInstanceOf(PutObjectCommand);
    const input = capturedCommand?.input;
    expect(input?.Bucket).toBe('berthcare-local');
    expect(input?.ContentType).toBe('image/heic');
    expect(input?.Metadata).toMatchObject({
      visit_id: 'visit-123',
      caregiver_id: 'caregiver-789',
      device_model: 'iPhone 15',
      checksum_sha256: 'abc123',
      captured_at: '2025-01-02T03:04:05.000Z',
      compression_codec: 'heic',
      compression_quality: '85',
      original_bytes: '2000000',
      compressed_bytes: '1100000',
      image_width: '4032',
      image_height: '3024',
      compression_ratio: expect.any(String),
    });
  });
});
