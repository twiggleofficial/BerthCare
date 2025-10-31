import { Router, type Request, type Response } from 'express';

import { generatePhotoUploadUrl } from '../storage/s3';
import { logger } from '../logger';
import { sanitisePhotoUploadPayload } from './validation';

export const photoRouter = Router();

photoRouter.post('/upload-url', async (req: Request, res: Response) => {
  const validation = sanitisePhotoUploadPayload(req.body);

  if (!validation.ok) {
    res.status(400).json({
      message: 'Invalid request body',
      errors: validation.errors
    });
    return;
  }

  const payload = validation.value;

  try {
    const result = await generatePhotoUploadUrl({
      fileName: payload.fileName,
      contentType: payload.fileType,
      visitId: payload.visitId,
      caregiverId: payload.caregiverId,
      metadata: payload.metadata,
      expiresInSeconds: payload.expiresInSeconds
    });

    res.status(200).json({
      uploadUrl: result.uploadUrl,
      photoKey: result.photoKey,
      expiresIn: result.expiresInSeconds,
      expiresAt: result.expiresAt,
      bucket: result.bucket
    });
    return;
  } catch (error) {
    logger.error('Failed to generate photo upload URL', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error
    });

    const responseBody: { error: string; details?: string } = {
      error: 'Failed to generate upload URL'
    };

    if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
      responseBody.details = error.message;
    }

    res.status(500).json(responseBody);
    return;
  }
});

photoRouter.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not Found' });
});
