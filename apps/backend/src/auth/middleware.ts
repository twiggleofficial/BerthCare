import type { NextFunction, Request, Response } from 'express';

import { createErrorResponse } from '../errors/create-error-response.js';
import { SessionError } from './session-service.js';
import type { SessionService } from './session-service.js';

/**
 * RBAC strategy mirrors project-documentation/architecture-output.md (Role-Based Access Control section).
 * Guiding principle: deliver lean, predictable services and obsess over unseen details.
 */
export type Role = 'caregiver' | 'coordinator' | 'admin' | 'family';

const ROLE_PERMISSIONS = {
  caregiver: [
    'read:own_schedule',
    'read:assigned_clients',
    'read:own_visits',
    'write:visit_documentation',
    'write:visit_photos',
    'write:visit_signatures',
    'create:visits',
    'create:alerts',
    'create:messages',
    'update:own_profile',
    'update:visit_status',
    'delete:own_draft_visits',
  ],
  coordinator: [
    'read:zone_data',
    'read:staff_schedules',
    'read:visits',
    'write:care_plans',
    'write:client_info',
    'write:schedules',
    'create:clients',
    'create:users_caregiver',
    'create:alerts',
    'update:care_plans',
    'update:schedules',
    'update:client_info',
    'delete:draft_visits',
    'delete:alerts',
  ],
  admin: [
    'read:all_zones',
    'write:all_entities',
    'create:all_entities',
    'update:all_entities',
    'update:system_settings',
    'delete:all_entities',
  ],
  family: [
    'read:daily_summaries',
    'read:visit_history',
    'read:schedules',
    'create:callback_requests',
  ],
} as const satisfies Record<Role, readonly string[]>;

type RolePermissionMap = typeof ROLE_PERMISSIONS;

export type Permission = RolePermissionMap[keyof RolePermissionMap][number];

export interface AuthenticatedUser {
  id: string;
  role: Role;
  zoneId: string | null;
  /**
   * Optional per-user overrides in addition to role-derived permissions.
   */
  permissions?: Permission[];
  /**
   * Additional zones the member may access beyond the primary zoneId.
   */
  accessibleZoneIds?: string[];
}

export type DeviceSessionContext = {
  id: string;
  userId: string;
  deviceName: string;
  supportsBiometric: boolean;
  rotationId: string;
  tokenId: string;
  refreshTokenExpiresAt: Date;
  lastSeenAt: Date | null;
};

export type AuthorizationRequest = Request & {
  user?: AuthenticatedUser;
  deviceSession?: DeviceSessionContext;
  accessToken?: string;
};

const DEFAULT_ZONE_PARAM = 'zoneId';

const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const normalize = (value: string): string => {
  return value.trim().toLowerCase();
};

const resolveZoneId = (req: AuthorizationRequest, zoneParam: string): string | undefined => {
  const paramValue = (req.params?.[zoneParam] ?? undefined) as string | undefined;
  if (typeof paramValue === 'string' && paramValue.trim().length > 0) {
    return paramValue;
  }

  const bodyValue = (req.body && typeof req.body === 'object'
    ? (req.body as Record<string, unknown>)[zoneParam]
    : undefined) as string | undefined;
  if (typeof bodyValue === 'string' && bodyValue.trim().length > 0) {
    return bodyValue;
  }

  const queryValue = req.query?.[zoneParam];
  if (typeof queryValue === 'string' && queryValue.trim().length > 0) {
    return queryValue;
  }
  if (Array.isArray(queryValue) && queryValue.length > 0 && typeof queryValue[0] === 'string') {
    return queryValue[0];
  }

  const headerValue = req.headers?.['x-zone-id'];
  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue;
  }
  if (Array.isArray(headerValue) && headerValue.length > 0) {
    return headerValue[0];
  }

  return undefined;
};

export const hasRole = (user: AuthenticatedUser | undefined, roles: Role | Role[]): boolean => {
  if (!user) {
    return false;
  }

  const allowedRoles = toArray(roles);
  return allowedRoles.includes(user.role);
};

type PermissionMatchMode = 'any' | 'all';

type PermissionCheckOptions = {
  match?: PermissionMatchMode;
};

export const hasPermission = (
  user: AuthenticatedUser | undefined,
  required: Permission | Permission[],
  options: PermissionCheckOptions = {},
): boolean => {
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  const match: PermissionMatchMode = options.match ?? 'all';
  const requiredPermissions = toArray(required);

  if (requiredPermissions.length === 0) {
    return true;
  }

  const basePermissions = ROLE_PERMISSIONS[user.role] ?? [];
  const overrides = user.permissions ?? [];
  const effectivePermissions = new Set<Permission>([...basePermissions, ...overrides]);

  if (match === 'any') {
    return requiredPermissions.some((permission) => effectivePermissions.has(permission));
  }

  return requiredPermissions.every((permission) => effectivePermissions.has(permission));
};

export const canAccessZone = (
  user: AuthenticatedUser | undefined,
  zoneId: string | null | undefined,
): boolean => {
  if (!user) {
    return false;
  }

  if (!zoneId) {
    return true;
  }

  if (user.role === 'admin') {
    return true;
  }

  const normalizedZone = normalize(zoneId);

  if (user.zoneId && normalize(user.zoneId) === normalizedZone) {
    return true;
  }

  if (user.accessibleZoneIds?.some((candidate) => normalize(candidate) === normalizedZone)) {
    return true;
  }

  return false;
};

const respondWithError = (res: Response, status: number, code: string, message?: string): void => {
  res.status(status).json(
    createErrorResponse({
      code,
      message,
      requestId: typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined,
    }),
  );
};

const extractAccessToken = (req: Request): string | undefined => {
  const header = req.get ? req.get('authorization') : undefined;
  const candidate =
    typeof header === 'string'
      ? header
      : typeof req.headers?.authorization === 'string'
        ? req.headers.authorization
        : undefined;

  if (!candidate) {
    return undefined;
  }

  const trimmed = candidate.trim();

  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }

  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : undefined;
};

export const loadDeviceSession =
  (sessionService: SessionService) =>
  async (req: AuthorizationRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = extractAccessToken(req);
    if (!token) {
      respondWithError(res, 401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
      return;
    }

    try {
      const context = await sessionService.loadSessionContext(token);

      req.accessToken = token;
      req.user = {
        id: context.user.id,
        role: context.user.role,
        zoneId: context.user.zoneId,
        permissions: context.user.permissions as Permission[] | undefined,
        accessibleZoneIds: context.user.accessibleZoneIds,
      };
      req.deviceSession = {
        id: context.deviceSession.id,
        userId: context.deviceSession.userId,
        deviceName: context.deviceSession.deviceName,
        supportsBiometric: context.deviceSession.supportsBiometric,
        rotationId: context.deviceSession.rotationId,
        tokenId: context.deviceSession.tokenId,
        refreshTokenExpiresAt: context.deviceSession.refreshTokenExpiresAt,
        lastSeenAt: context.deviceSession.lastSeenAt,
      };

      next();
    } catch (error) {
      if (error instanceof SessionError) {
        respondWithError(res, error.status, error.code, error.expose ? error.message : undefined);
        return;
      }

      next(error);
    }
  };

type ZoneRequirement =
  | false
  | {
      param?: string;
      resolver?: (req: AuthorizationRequest) => string | null | undefined;
      required?: boolean;
    };

export type AuthorizationOptions = {
  roles?: Role | Role[];
  allPermissions?: Permission | Permission[];
  anyPermissions?: Permission | Permission[];
  zone?: ZoneRequirement;
};

export type AuthorizationMiddleware = (
  req: AuthorizationRequest,
  res: Response,
  next: NextFunction,
) => void;

export const authorize = (options: AuthorizationOptions = {}): AuthorizationMiddleware => {
  const requiredRoles = toArray(options.roles);
  const allPermissions = toArray(options.allPermissions);
  const anyPermissions = toArray(options.anyPermissions);

  const zoneOption = options.zone ?? true;

  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      respondWithError(res, 401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
      return;
    }

    if (requiredRoles.length > 0 && !hasRole(user, requiredRoles)) {
      respondWithError(res, 403, 'AUTH_INSUFFICIENT_ROLE', 'You do not have access to this resource.');
      return;
    }

    if (allPermissions.length > 0 && !hasPermission(user, allPermissions, { match: 'all' })) {
      respondWithError(res, 403, 'AUTH_INSUFFICIENT_PERMISSIONS', 'You do not have permission to perform this action.');
      return;
    }

    if (anyPermissions.length > 0 && !hasPermission(user, anyPermissions, { match: 'any' })) {
      respondWithError(res, 403, 'AUTH_INSUFFICIENT_PERMISSIONS', 'You do not have permission to perform this action.');
      return;
    }

    if (zoneOption !== false) {
      const zoneParam =
        typeof zoneOption === 'object' && zoneOption.param ? zoneOption.param : DEFAULT_ZONE_PARAM;
      const zoneResolver =
        typeof zoneOption === 'object' && zoneOption.resolver
          ? zoneOption.resolver
          : (request: AuthorizationRequest) => resolveZoneId(request, zoneParam);

      const requiredZoneId = zoneResolver(req);

      if (requiredZoneId) {
        if (!canAccessZone(user, requiredZoneId)) {
          respondWithError(res, 403, 'AUTH_ZONE_ACCESS_DENIED', 'You do not have access to this zone.');
          return;
        }
      } else if (typeof zoneOption === 'object' && zoneOption.required) {
        respondWithError(res, 400, 'AUTH_ZONE_CONTEXT_REQUIRED', 'Zone context is required for this operation.');
        return;
      }
    }

    next();
  };
};
