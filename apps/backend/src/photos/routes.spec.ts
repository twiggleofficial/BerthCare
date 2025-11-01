/**
 * @jest-environment node
 */

import express, { type Express } from 'express';
import http from 'http';
import type { AddressInfo } from 'net';

const mockAuthenticateJwt = jest.fn((_req, _res, next) => next());
const mockSanitisePayload = jest.fn();
const mockGenerateUploadUrl = jest.fn();

jest.mock('../auth/middleware', () => ({
  authenticateJwt: (req: express.Request, res: express.Response, next: express.NextFunction) =>
    mockAuthenticateJwt(req, res, next),
}));

jest.mock('./validation', () => ({
  sanitisePhotoUploadPayload: (...args: unknown[]) => mockSanitisePayload(...args),
}));

jest.mock('../storage/s3', () => ({
  generatePhotoUploadUrl: (...args: unknown[]) => mockGenerateUploadUrl(...args),
}));

const logger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../logger', () => ({
  logger,
}));

const originalEnv = { ...process.env };

const sendRequest = async (
  app: Express,
  options: { method?: string; path: string; headers?: http.OutgoingHttpHeaders; body?: string }
) => {
  return await new Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }>(
    (resolve, reject) => {
      const server = http.createServer(app);
      server.listen(0, () => {
        const address = server.address() as AddressInfo;
        const request = http.request(
          {
            host: '127.0.0.1',
            port: address.port,
            method: options.method ?? 'GET',
            path: options.path,
            headers: options.headers,
          },
          (response) => {
            let data = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
              data += chunk;
            });
            response.on('end', () => {
              server.close();
              resolve({
                status: response.statusCode ?? 0,
                body: data,
                headers: response.headers,
              });
            });
          }
        );

        request.on('error', (error) => {
          server.close();
          reject(error);
        });

        if (options.body) {
          request.write(options.body);
        }

        request.end();
      });
    }
  );
};

const loadRouter = () => {
  let module: typeof import('./routes');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    module = require('./routes');
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return module!;
};

const buildTestApp = () => {
  const { photoRouter } = loadRouter();
  const app = express();
  app.use(express.json());
  app.use(photoRouter);
  return app;
};

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockAuthenticateJwt.mockImplementation((_req, _res, next) => next());
  mockSanitisePayload.mockReset();
  mockGenerateUploadUrl.mockReset();
  process.env = { ...originalEnv };
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  process.env = originalEnv;
});

describe('photoRouter', () => {
  it('authenticates requests before handling routes', async () => {
    mockSanitisePayload.mockReturnValue({
      ok: true,
      value: {
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        visitId: 'visit-1',
      },
    });
    mockGenerateUploadUrl.mockResolvedValue({
      uploadUrl: 'https://example.com/upload',
      photoKey: 'visits/visit-1/photo.jpg',
      expiresInSeconds: 900,
      expiresAt: '2025-01-01T00:00:00.000Z',
      bucket: 'bucket-name',
    });

    const app = buildTestApp();
    const response = await sendRequest(app, {
      method: 'POST',
      path: '/upload-url',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(200);
    expect(mockAuthenticateJwt).toHaveBeenCalled();
    expect(mockSanitisePayload).toHaveBeenCalledWith({});

    const body = JSON.parse(response.body);
    expect(body).toEqual({
      uploadUrl: 'https://example.com/upload',
      photoKey: 'visits/visit-1/photo.jpg',
      expiresIn: 900,
      expiresAt: '2025-01-01T00:00:00.000Z',
      bucket: 'bucket-name',
    });
  });

  it('returns validation errors when payload is invalid', async () => {
    mockSanitisePayload.mockReturnValue({
      ok: false,
      errors: ['fileName is required'],
    });

    const app = buildTestApp();
    const response = await sendRequest(app, {
      method: 'POST',
      path: '/upload-url',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toEqual({
      message: 'Invalid request body',
      errors: ['fileName is required'],
    });
  });

  it('logs and returns error details in non-production environments', async () => {
    process.env.NODE_ENV = 'development';
    mockSanitisePayload.mockReturnValue({
      ok: true,
      value: {
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        visitId: 'visit-1',
      },
    });
    mockGenerateUploadUrl.mockRejectedValue(new Error('s3 unavailable'));

    const app = buildTestApp();
    const response = await sendRequest(app, {
      method: 'POST',
      path: '/upload-url',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(500);
    const body = JSON.parse(response.body);
    expect(body).toEqual({
      error: 'Failed to generate upload URL',
      details: 's3 unavailable',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to generate photo upload URL',
      expect.objectContaining({
        error: expect.objectContaining({ message: 's3 unavailable' }),
      })
    );
  });

  it('omits error details in production responses', async () => {
    process.env.NODE_ENV = 'production';
    mockSanitisePayload.mockReturnValue({
      ok: true,
      value: {
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        visitId: 'visit-1',
      },
    });
    mockGenerateUploadUrl.mockRejectedValue(new Error('s3 unavailable'));

    const app = buildTestApp();
    const response = await sendRequest(app, {
      method: 'POST',
      path: '/upload-url',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(500);
    const body = JSON.parse(response.body);
    expect(body).toEqual({
      error: 'Failed to generate upload URL',
    });
  });

  it('returns 404 for unmatched routes', async () => {
    const app = buildTestApp();
    const response = await sendRequest(app, { path: '/unknown' });

    expect(response.status).toBe(404);
    const body = JSON.parse(response.body);
    expect(body).toEqual({ message: 'Not Found' });
  });
});
