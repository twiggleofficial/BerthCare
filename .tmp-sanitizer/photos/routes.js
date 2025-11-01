'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.photoRouter = void 0;
const express_1 = require('express');
const s3_1 = require('../storage/s3');
const logger_1 = require('../logger');
const validation_1 = require('./validation');
const middleware_1 = require('../auth/middleware');
exports.photoRouter = (0, express_1.Router)();
exports.photoRouter.use(middleware_1.authenticateJwt);
exports.photoRouter.post('/upload-url', async (req, res) => {
  const validation = (0, validation_1.sanitisePhotoUploadPayload)(req.body);
  if (!validation.ok) {
    res.status(400).json({
      message: 'Invalid request body',
      errors: validation.errors,
    });
    return;
  }
  const payload = validation.value;
  try {
    const result = await (0, s3_1.generatePhotoUploadUrl)({
      fileName: payload.fileName,
      contentType: payload.fileType,
      visitId: payload.visitId,
      caregiverId: payload.caregiverId,
      metadata: payload.metadata,
      expiresInSeconds: payload.expiresInSeconds,
    });
    res.status(200).json({
      uploadUrl: result.uploadUrl,
      photoKey: result.photoKey,
      expiresIn: result.expiresInSeconds,
      expiresAt: result.expiresAt,
      bucket: result.bucket,
    });
    return;
  } catch (error) {
    logger_1.logger.error('Failed to generate photo upload URL', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    const responseBody = {
      error: 'Failed to generate upload URL',
    };
    if (
      error instanceof Error &&
      (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
    ) {
      responseBody.details = error.message;
    }
    res.status(500).json(responseBody);
    return;
  }
});
exports.photoRouter.use((_req, res) => {
  res.status(404).json({ message: 'Not Found' });
});
