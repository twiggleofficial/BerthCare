import { sanitisePhotoUploadPayload } from './validation';

describe('photo upload validation', () => {
  it('returns sanitised payload for valid input', () => {
    const result = sanitisePhotoUploadPayload({
      fileName: ' photo.jpeg ',
      fileType: ' image/jpeg ',
      visitId: ' visit-123 ',
      caregiverId: ' caregiver-456 ',
      expiresInSeconds: '600',
      metadata: {
        deviceModel: ' iPhone 15 ',
        checksumSha256: ' abcdef ',
        capturedAt: '2025-01-02T03:04:05.000Z',
        compression: {
          codec: 'jpeg',
          quality: '80',
          originalBytes: '1000000',
          compressedBytes: 750000,
          width: 4032,
          height: '3024'
        }
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected validation to succeed');
    }

    const payload = result.value;
    expect(payload.fileName).toBe('photo.jpeg');
    expect(payload.fileType).toBe('image/jpeg');
    expect(payload.visitId).toBe('visit-123');
    expect(payload.caregiverId).toBe('caregiver-456');
    expect(payload.expiresInSeconds).toBe(600);
    expect(payload.metadata).toBeDefined();
    expect(payload.metadata?.capturedAt).toBeInstanceOf(Date);
    expect(payload.metadata?.deviceModel).toBe('iPhone 15');
    expect(payload.metadata?.checksumSha256).toBe('abcdef');
    expect(payload.metadata?.compression).toMatchObject({
      codec: 'jpeg',
      quality: 80,
      originalBytes: 1_000_000,
      compressedBytes: 750_000,
      width: 4032,
      height: 3024
    });
  });

  it('returns errors for invalid request payload', () => {
    const result = sanitisePhotoUploadPayload({
      fileName: '',
      fileType: '',
      visitId: null,
      expiresInSeconds: 30,
      metadata: {
        capturedAt: 'not-a-date',
        compression: {
          codec: 'bmp',
          quality: 200
        }
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected validation to fail');
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        'fileName is required',
        'fileType is required',
        'visitId is required',
        'expiresInSeconds must be between 60 and 3600',
        'metadata.capturedAt must be an ISO 8601 date string',
        'metadata.compression.codec must be one of jpeg, heic, webp, png'
      ])
    );
  });
});

