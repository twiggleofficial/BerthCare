import type { NextFunction, Request, Response } from 'express';
import type { SessionService } from './session-service.js';
/**
 * RBAC strategy mirrors project-documentation/architecture-output.md (Role-Based Access Control section).
 * Guiding principle: deliver lean, predictable services and obsess over unseen details.
 */
export type Role = 'caregiver' | 'coordinator' | 'admin' | 'family';
declare const ROLE_PERMISSIONS: {
    readonly caregiver: readonly ["read:own_schedule", "read:assigned_clients", "read:own_visits", "write:visit_documentation", "write:visit_photos", "write:visit_signatures", "create:visits", "create:alerts", "create:messages", "update:own_profile", "update:visit_status", "delete:own_draft_visits"];
    readonly coordinator: readonly ["read:zone_data", "read:staff_schedules", "read:visits", "write:care_plans", "write:client_info", "write:schedules", "create:clients", "create:users_caregiver", "create:alerts", "update:care_plans", "update:schedules", "update:client_info", "delete:draft_visits", "delete:alerts"];
    readonly admin: readonly ["read:all_zones", "write:all_entities", "create:all_entities", "update:all_entities", "update:system_settings", "delete:all_entities"];
    readonly family: readonly ["read:daily_summaries", "read:visit_history", "read:schedules", "create:callback_requests"];
};
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
export declare const hasRole: (user: AuthenticatedUser | undefined, roles: Role | Role[]) => boolean;
type PermissionMatchMode = 'any' | 'all';
type PermissionCheckOptions = {
    match?: PermissionMatchMode;
};
export declare const hasPermission: (user: AuthenticatedUser | undefined, required: Permission | Permission[], options?: PermissionCheckOptions) => boolean;
export declare const canAccessZone: (user: AuthenticatedUser | undefined, zoneId: string | null | undefined) => boolean;
export declare const loadDeviceSession: (sessionService: SessionService) => (req: AuthorizationRequest, res: Response, next: NextFunction) => Promise<void>;
type ZoneRequirement = false | {
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
export type AuthorizationMiddleware = (req: AuthorizationRequest, res: Response, next: NextFunction) => void;
export declare const authorize: (options?: AuthorizationOptions) => AuthorizationMiddleware;
export {};
