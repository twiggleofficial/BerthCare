import type { NextFunction, Request, Response } from 'express';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from './error-handler.js';

type MockResponse = Response & {
  statusCode?: number;
  body?: unknown;
  statusMock: Mock<[status: number], MockResponse>;
  jsonMock: Mock<[payload: unknown], MockResponse>;
};

const createMockResponse = (): MockResponse => {
  const res = {
    locals: { requestId: 'test-request-id' },
    headersSent: false,
  } as Partial<MockResponse>;

  res.statusMock = vi.fn((status: number) => {
    res.statusCode = status;
    return res as MockResponse;
  }) as Mock<[status: number], MockResponse>;
  res.status = res.statusMock as unknown as MockResponse['status'];

  res.jsonMock = vi.fn((payload: unknown) => {
    res.body = payload;
    return res as MockResponse;
  }) as Mock<[payload: unknown], MockResponse>;
  res.json = res.jsonMock as unknown as MockResponse['json'];

  return res as MockResponse;
};

const createMockRequest = (overrides: Partial<Request> = {}) => {
  return {
    originalUrl: '/test',
    ...overrides,
  } as Request;
};

describe('errorHandler', () => {
  it('returns structured response for client errors', () => {
    const error = Object.assign(new Error('Invalid input'), {
      status: 400,
      code: 'VALIDATION_INVALID_FORMAT',
      details: { field: 'email' },
    });
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn<Parameters<NextFunction>, ReturnType<NextFunction>>();

    errorHandler(error, req, res, next as unknown as NextFunction);

    expect(res.statusMock).toHaveBeenCalledWith(400);
    expect(res.jsonMock).toHaveBeenCalled();
    const payload = res.jsonMock.mock.calls[0]?.[0] as {
      error: {
        code: string;
        message: string;
        details?: unknown;
        timestamp: string;
        requestId?: string;
      };
    };
    expect(payload).toMatchObject({
      error: {
        code: 'VALIDATION_INVALID_FORMAT',
        message: 'Invalid input',
        requestId: 'test-request-id',
        details: { field: 'email' },
      },
    });
    expect(typeof payload.error.timestamp).toBe('string');
    expect(next).not.toHaveBeenCalled();
  });

  it('defaults to server error code and message when missing', () => {
    const error = Object.assign(new Error('Sensitive failure'), {
      status: 502,
    });
    const req = createMockRequest({ originalUrl: '/server' });
    const res = createMockResponse();
    const next = vi.fn<Parameters<NextFunction>, ReturnType<NextFunction>>();

    errorHandler(error, req, res, next as unknown as NextFunction);

    expect(res.statusMock).toHaveBeenCalledWith(502);
    const payload = res.jsonMock.mock.calls[0]?.[0] as {
      error: { code: string; message: string; details?: unknown; requestId?: string; timestamp: string };
    };
    expect(payload).toMatchObject({
      error: {
        code: 'SERVER_UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        requestId: 'test-request-id',
      },
    });
    expect(payload.error.details).toBeUndefined();
    expect(typeof payload.error.timestamp).toBe('string');
    expect(next).not.toHaveBeenCalled();
  });

  it('omits details when error exposure is disabled', () => {
    const error = Object.assign(new Error('Validation detail'), {
      status: 400,
      code: 'VALIDATION_INVALID_FORMAT',
      expose: false,
      details: { issues: ['must be present'] },
    });
    const req = createMockRequest({ originalUrl: '/secure' });
    const res = createMockResponse();
    const next = vi.fn<Parameters<NextFunction>, ReturnType<NextFunction>>();

    errorHandler(error, req, res, next as unknown as NextFunction);

    const payload = res.jsonMock.mock.calls[0]?.[0] as {
      error: { code: string; message: string; details?: unknown; requestId?: string; timestamp: string };
    };
    expect(payload).toMatchObject({
      error: {
        code: 'VALIDATION_INVALID_FORMAT',
        message: 'Invalid data format',
        requestId: 'test-request-id',
      },
    });
    expect(payload.error.details).toBeUndefined();
    expect(typeof payload.error.timestamp).toBe('string');
    expect(next).not.toHaveBeenCalled();
  });
});
