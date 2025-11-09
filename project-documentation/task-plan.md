# BerthCare Implementation Plan

**Version:** 1.0.0  
**Created:** November 6, 2025  
**Design lens:** Simplicity is the ultimate sophistication

---

## Executive Summary

This implementation plan transforms the BerthCare technical architecture into sprint-ready engineering tasks. Every requirement from the architecture blueprint maps to concrete, verifiable steps with zero omissions.

**Core Design lens:**

- Say no to 1,000 things - focus on core workflows only
- Start with user experience, work backwards to technology
- Obsess over every detail - sub-second response times aren't optional
- If users need a manual, the design has failed

**Timeline:** 6 months with team of 5 engineers (2 backend, 2 mobile, 1 DevOps)  
**Critical Path:** Environment → Backend Core → Mobile Core → Offline Sync → Testing → Launch

---

## Phase E – Environment & Tooling

| ID  | Title | Description | Deps | Deliverables| Acceptance  | Role   | Effort |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ | ------ |
| E1  | Initialize Git repository   | Create monorepo at github.com/berthcare/berthcare; add README.md, LICENSE (MIT), .gitignore (Node, React Native, IDE files), .editorconfig (2 spaces, UTF-8, LF), CODEOWNERS (assign team leads); enable branch protections on `main` (require 1 review, status checks, signed commits); initial commit with scaffold. Cite project-documentation/architecture-output.md v2.0 – Infrastructure section. Assumptions: GitHub organization exists, team members have access. Design lens: make tooling invisible, question defaults, and own the stack.   | –    | Repo URL; base scaffold files; branch protection rules active | Repo accessible; protections enforced; initial commit visible; README describes project  | DevOps | 0.5d   |
| E2  | Set up CI bootstrap | Configure GitHub Actions workflow `.github/workflows/ci.yml` to run on PRs to `main`: ESLint, TypeScript type checks, Jest unit tests, npm audit for dependencies, SAST with Semgrep. Required checks enforced in branch rules. Cite project-documentation/architecture-output.md – CI/CD section. Design lens: make tooling invisible, question defaults, and own the stack.  | E1   | `.github/workflows/ci.yml`; passing sample run| CI runs on PR; all checks pass; required in branch rules   | DevOps | 1d|
| E3  | Configure monorepo structure| Set up pnpm workspace with `pnpm-workspace.yaml`; create `/apps/backend`, `/apps/mobile`, `/libs/shared`, `/libs/utils`; configure TypeScript project references in `tsconfig.base.json`; add shared ESLint and Prettier configs. Cite project-documentation/architecture-output.md – Project Structure. Design lens: make tooling invisible, question defaults, and own the stack.  | E2   | Workspace config; folder structure; shared configs | `pnpm install` works; TypeScript builds; linting runs| DevOps | 1d|
| E4  | Set up local development environment | Create `docker-compose.yml` for local PostgreSQL 15, Redis 7, and LocalStack (S3 mock); add `.env.example` with all required environment variables; create `Makefile` with commands: `make setup`, `make start`, `make stop`, `make test`, `make clean`; document setup in README. Cite project-documentation/architecture-output.md – Data Layer. Design lens: make tooling invisible, question defaults, and own the stack.  | E3   | `docker-compose.yml`; `.env.example`; `Makefile`; updated README| `make setup && make start` launches all services; services accessible on documented ports| DevOps | 1.5d   |
| E5  | Configure AWS infrastructure (staging)    | Set up AWS account in ca-central-1 region; create VPC with public/private subnets; provision RDS PostgreSQL 15 (db.t3.micro for staging); ElastiCache Redis 7 (cache.t3.micro); S3 bucket with encryption; configure security groups (least privilege); set up IAM roles for ECS tasks. Use Terraform for IaC. Cite project-documentation/architecture-output.md – Infrastructure, Canadian data residency. Assumptions: AWS account exists, billing configured. Design lens: make tooling invisible, question defaults, and own the stack.| E4   | Terraform configs in `/infra/terraform/environments/staging`; provisioned AWS resources   | `terraform apply` succeeds; resources accessible; costs within budget ($200/month staging)    | DevOps | 2d|
| E6  | Set up monitoring and logging  | Emit structured JSON logs (in-house logger) to CloudWatch log group `/aws/ecs/berthcare-staging/backend`; provision CloudWatch metric filters (request count, error count, latency) feeding the `berthcare-staging-observability` dashboard (latency p50/p95/p99, error %, DB connections); wire CloudWatch alarms (error rate >1%/5m, API p95 >2s/5m) to SNS for alert fan-out; bootstrap Sentry for backend and mobile with env-tagged DSNs surfaced via `.env.example`, plus README runbook. Cite project-documentation/architecture-output.md – Monitoring. Design lens: make tooling invisible, question defaults, and own the stack. | E5   | Structured logging utilities; Terraform monitoring stack; Sentry-ready configs; README runbook | Logs ship to CloudWatch; dashboard renders metrics; synthetic error lands in Sentry; alarms reach SNS topic | DevOps | 1.5d   |
| E7  | Update architecture docs – Infrastructure | Add infrastructure details to `/docs/architecture.md`: repo structure, CI/CD pipeline, AWS resources, monitoring setup. Include diagrams for VPC layout and deployment flow. Design lens: make tooling invisible, question defaults, and own the stack.    | E6   | Updated `/docs/architecture.md` with infrastructure section| Docs reflect current infrastructure; diagrams accurate | DevOps | 0.5d   |

---

## Phase B – Backend Core

| ID| Title| Description| Deps | Deliverables   | Acceptance | Role   | Effort |
| ---------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| G1| Create feature branch – backend foundation | Branch `feat/backend-foundation` from `main`; open draft PR with checklist: database schema, API scaffold, auth endpoints, tests. Link to B1-B10 tasks. Design lens: deliver lean, predictable services and obsess over unseen details.| E7   | Branch `feat/backend-foundation`; draft PR   | PR open; CI triggered; checklist visible    | Backend Dev | 0.1d   |
| B1 | Initialize backend application  | Create Express.js 4.x app in `/apps/backend`; configure TypeScript; add dependencies: express, pg (PostgreSQL client), ioredis (Redis client), helmet (security headers), express-rate-limit, joi (validation), bcrypt, jsonwebtoken, winston (logging), dotenv. Set up feature-based folder structure: `/src/auth`, `/src/alerts`, `/src/visits`, `/src/clients`, `/src/care-plans`, `/src/family`, `/src/sync`, `/src/twilio`, plus shared `/src/cache`, `/src/database`, `/src/storage`, `/src/logger`. Cite project-documentation/architecture-output.md – Backend Services, Technology Stack. Design lens: deliver lean, predictable services and obsess over unseen details. | G1   | Backend app scaffold; `package.json` with dependencies; folder structure   | `pnpm install` works; `pnpm dev` starts server on port 3000  | Backend Dev | 1d|
| B2   | Design and implement database schema    | Create PostgreSQL migration files using node-pg-migrate: `users`, `zones`, `clients`, `emergency_contacts`, `medications`, `visits`, `visit_documentation`, `photos`, `alerts`, `alert_recipients`, `sync_log` tables. Include all indexes, foreign keys, constraints, triggers for `updated_at`. Add seed data for development (2 zones, 5 users, 10 clients, 20 visits). Cite project-documentation/architecture-output.md – Database Schema section. Assumptions: UUIDs for all primary keys, timestamps on all tables, soft deletes with `is_active` flags. Design lens: deliver lean, predictable services and obsess over unseen details.| B1   | Migration files in `/apps/backend/migrations`; seed script| Migrations run successfully; seed data loads; all constraints enforced; indexes created    | Backend Dev | 2d|
| B3| Implement database connection pool | Configure pg Pool with settings from project-documentation/architecture-output.md: min 10, max 50 connections, idle timeout 30s, connection timeout 2s, statement timeout 30s. Create `/apps/backend/src/database/pool.ts` with connection management, health check endpoint, graceful shutdown. Add connection retry logic with exponential backoff. Design lens: deliver lean, predictable services and obsess over unseen details.| B2   | `/apps/backend/src/database/pool.ts`; health check endpoint `/health/db`   | Pool connects to database; health check returns 200; handles connection failures gracefully; logs connection metrics| Backend Dev | 1d|
| B4    | Implement Redis cache layer| Configure ioredis client with connection pooling; create `/apps/backend/src/cache/redis.ts` with cache-aside pattern helpers: `get`, `set`, `del`, `invalidate`. Implement cache TTL constants from project-documentation/architecture-output.md (client_list: 5min, client_detail: 10min, user_profile: 15min, visit_schedule: 2min, care_plan: 30min). Add cache health check. Design lens: deliver lean, predictable services and obsess over unseen details.    | B3   | `/apps/backend/src/cache/redis.ts`; cache helper functions; health check `/health/cache` | Redis connects; cache operations work; TTLs enforced; health check returns 200  | Backend Dev | 1d|
| B5  | Implement activation initiation endpoint| Create POST `/v1/auth/activate` that validates pre-provisioned activation codes (bcrypt hash), enforces 24-hour expiry, rate limits attempts, records device fingerprint, and returns activation token + basic user profile. Persist activation attempts for audit. Cite project-documentation/architecture-output.md – Activation Flow (Step 1). Design lens: deliver lean, predictable services and obsess over unseen details. | B4   | Activation endpoint; activation code storage; attempt logging | Valid code returns activation token; expired/invalid codes return correct errors; rate limiting enforced; audit trail populated; tests ≥80% coverage | Backend Dev | 2d|
| B6  | Implement activation completion & device sessions| Create POST `/v1/auth/activate/complete` that exchanges activation token for access/refresh tokens, stores device metadata, hashes 6-digit offline PIN with scrypt, and enforces one active caregiver session per device. Add device_sessions table with rotation + revocation helpers. Cite project-documentation/architecture-output.md – Activation Flow (Step 2). Design lens: deliver lean, predictable services and obsess over unseen details. | B5   | Activation completion endpoint; device_sessions table; PIN hashing utilities  | Completing activation issues tokens; invalid/expired tokens rejected; device binding enforced; PIN policy validated; tests ≥80% coverage  | Backend Dev | 2d|
| B7| Implement authorization middleware | Extend `/apps/backend/src/auth/middleware.ts` with role-based access control (RBAC) for roles: caregiver, coordinator, admin, family. Implement zone-based access checks. Add permission helpers: `hasRole`, `hasPermission`, `canAccessZone`. Cite project-documentation/architecture-output.md – Role-Based Access Control section. Design lens: deliver lean, predictable services and obsess over unseen details.  | B6   | Authorization middleware; RBAC helpers  | Middleware blocks unauthorized access; zone checks work; role checks work; tests ≥80% coverage| Backend Dev | 1.5d   |
| B8    | Implement error handling middleware| Update `/apps/backend/src/app.ts` to expose centralized error handling with consistent response format (code, message, details, timestamp, requestId). Implement error codes from project-documentation/architecture-output.md (AUTH*\*, VALIDATION*\_, RESOURCE\_\_, CONFLICT*\*, SERVER*\*). Add request ID generation and logging. Cite project-documentation/architecture-output.md – Error Response Format. Design lens: deliver lean, predictable services and obsess over unseen details.| B7   | Error handler in `app.ts`; error code constants | All errors return consistent format; error codes match spec; request IDs logged; tests cover all error types| Backend Dev | 1d|
| B9  | Implement API versioning and base routes| Set up Express router with `/v1` prefix; create base routes: GET `/v1/health` (overall health), GET `/v1/health/db`, GET `/v1/health/cache`. Add request logging middleware with winston. Configure CORS, helmet security headers, compression. Cite project-documentation/architecture-output.md – API Architecture. Design lens: deliver lean, predictable services and obsess over unseen details.  | B8   | Base routes; health checks; middleware stack | Health endpoints return 200; CORS configured; security headers present; request logging works | Backend Dev | 1d|
| B10 | Implement session refresh & revocation endpoints | Create POST `/v1/auth/session/refresh` that rotates refresh tokens, enforces device binding, and validates session freshness; add POST `/v1/auth/session/revoke` to invalidate device sessions. Implement middleware to load device session context for downstream routes. Cite project-documentation/architecture-output.md – Session Management. Design lens: deliver lean, predictable services and obsess over unseen details.| B9   | Refresh/revoke endpoints; session middleware | Refresh returns new tokens; revoked sessions blocked; rotation audit logged; offline PIN fallback covered; tests ≥80% coverage | Backend Dev | 1d|
| G2| Run CI, request review, merge PR – backend foundation | Address CI findings (lint, type, test, security); request ≥1 review from backend lead; address feedback; squash-merge using Conventional Commits format: "feat(backend): initialize backend application with auth and database"; delete branch. Design lens: deliver lean, predictable services and obsess over unseen details.   | B10  | Merged PR; passing CI; release notes fragment| CI green; ≥1 approval; branch deleted; main branch updated| Backend Dev | 0.25d  |

---

## Phase M – Mobile Core

| ID  | Title    | Description  | Deps | Deliverables    | Acceptance  | Role| Effort |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| G3  | Create feature branch – mobile foundation | Branch `feat/mobile-foundation` from `main`; open draft PR with checklist: Expo setup, navigation, design system, auth experience. Link to M1-M11 tasks. Design lens: begin with caregiver flows so every interaction feels obvious and delightful. | E7   | Branch `feat/mobile-foundation`; draft PR| PR open; checklist visible  | Frontend Dev | 0.1d   |
| M1  | Initialize React Native app with Expo  | Create Expo app in `/apps/mobile` using `npx create-expo-app` with TypeScript template; configure `app.json` with app name "BerthCare", slug "berthcare", version "1.0.0", orientation "default", icon, splash screen. Add dependencies: expo-router, react-native-paper, zustand, @tanstack/react-query, @react-navigation/native. Cite project-documentation/architecture-output.md – Mobile App Technology Stack. Design lens: begin with caregiver flows so every interaction feels obvious and delightful. | G3   | Expo app in `/apps/mobile`; `app.json` configured; dependencies installed | `npx expo start` launches app; app loads on iOS simulator and Android emulator   | Frontend Dev | 1d|
| M2  | Set up design system tokens    | Create `/apps/mobile/src/design-system/tokens/` with colors.ts, typography.ts, spacing.ts, motion.ts based on Design System Style Guide. Export theme object compatible with React Native Paper. Implement 8-point grid spacing scale (4, 8, 16, 24, 32, 48). Cite design-documentation Color System, Typography, Spacing. Design lens: begin with caregiver flows so every interaction feels obvious and delightful.| M1   | Design tokens files; theme object| Tokens match design system spec; theme applies to Paper components | Frontend Dev | 1d|
| M3  | Implement core UI components   | Create `/apps/mobile/src/components/` with Button, Card, Input, Typography components following Design System Component specs. Ensure 48pt minimum touch targets, WCAG AA contrast ratios, support for reduced motion. Cite design-documentation Components, Accessibility. Design lens: begin with caregiver flows so every interaction feels obvious and delightful.| M2   | Core component library; Storybook stories (optional)| Components match design specs; accessibility tests pass; touch targets ≥48pt | Frontend Dev | 2d|
| M4  | Set up navigation structure    | Configure React Navigation with bottom tab navigator (3 tabs: Schedule, Clients, Profile) and stack navigators for each section. Implement deep linking support. Add navigation types for type-safe navigation. Cite project-documentation/architecture-output.md – Navigation Structure, design-documentation Navigation. Design lens: begin with caregiver flows so every interaction feels obvious and delightful.| M3   | Navigation setup; route types; deep linking config  | Navigation works; tabs switch correctly; deep links work; type-safe navigation   | Frontend Dev | 1.5d   |
| M5  | Implement global state management | Set up Zustand store in `/apps/mobile/src/store/` with slices: auth (user, tokens, isAuthenticated), sync (status, lastSyncTime, pendingChanges), network (isOnline), app (currentVisit). Configure persistence with AsyncStorage. Cite project-documentation/architecture-output.md – State Management Architecture. Design lens: begin with caregiver flows so every interaction feels obvious and delightful.| M4   | Zustand store; persistence config| State persists across app restarts; state updates trigger re-renders; dev tools work  | Frontend Dev | 1.5d   |
| M6  | Implement API client| Create `/apps/mobile/src/services/api/` with axios-based API client; configure base URL, request/response interceptors (add JWT, handle 401, log requests); implement retry logic with exponential backoff; add request timeout (30s). Set up React Query with default options (staleTime, cacheTime, retry). Cite project-documentation/architecture-output.md – API Architecture. Design lens: begin with caregiver flows so every interaction feels obvious and delightful. | M5   | API client; React Query setup; interceptors| API calls work; JWT added automatically; 401 triggers logout; retries work; React Query caches responses  | Frontend Dev | 2d|
| M7  | Implement activation experience| Create ActivationScreen with 8-digit code input (auto-advance, paste support, haptics) that calls POST `/v1/auth/activate`, handles error states, and persists activationToken + pending user profile. Add device fingerprint generation and analytics logging. Cite design-documentation/features/authentication-onboarding Authentication & Onboarding Design – Activation Flow. Design lens: begin with caregiver flows so every interaction feels obvious and delightful.| M6   | Activation screen; activationToken storage; analytics events| Valid code advances to next step; invalid/expired codes show inline error; rate limit messaging visible; activationToken stored securely| Frontend Dev | 2d|
| M8  | Implement biometric + PIN enrollment   | Build BiometricSetupScreen that invokes POST `/v1/auth/activate/complete`, stores hashed offline PIN, and registers biometrics via `expo-local-authentication`. Handle fallback when biometrics unavailable; surface copy from design spec. Cite design-documentation/features/authentication-onboarding Authentication & Onboarding Design – Biometric Setup . Design lens: begin with caregiver flows so every interaction feels obvious and delightful. | M7   | Biometric setup screen; PIN persistence; activation completion flow  | Successful enrollment issues session tokens; offline PIN stored encrypted; biometric opt-out path covered; activation completion errors handled gracefully | Frontend Dev | 2d|
| M9  | Implement protected route wrapper | Create `<ProtectedRoute>` that checks device session state, triggers biometric/ PIN unlock for returning users, and refreshes tokens on app foreground via `/v1/auth/session/refresh`. Show blocking loader during re-auth and offline PIN prompt when needed. Design lens: begin with caregiver flows so every interaction feels obvious and delightful.  | M8   | Protected route component; unlock modal; refresh logic | Locked app prompts biometric/PIN; successful unlock routes to app; expired sessions redirect to activation; refresh endpoint invoked on resume  | Frontend Dev | 1.5d   |
| M10 | Implement offline detection    | Add network state listener using `@react-native-community/netinfo`; update Zustand store on connectivity change; show offline banner when offline; hide when online. Cite project-documentation/architecture-output.md – Offline-First Architecture. Design lens: begin with caregiver flows so every interaction feels obvious and delightful. | M9   | Network listener; offline banner component | Offline banner shows when disconnected; hides when reconnected; state updates correctly  | Frontend Dev | 1d|
| M11 | Add app launch performance optimization| Implement splash screen with expo-splash-screen; optimize initial bundle size; lazy load non-critical screens; measure app launch time (target <2s). Cite project-documentation/architecture-output.md – Performance Requirements (<2s app launch). Design lens: begin with caregiver flows so every interaction feels obvious and delightful.  | M10  | Splash screen; lazy loading; performance metrics    | App launches in <2s on mid-range device; splash screen displays correctly  | Frontend Dev | 1d|
| G4  | Run CI, request review, merge PR – mobile foundation | Address CI findings; request ≥1 review from frontend lead; address feedback; squash-merge: "feat(mobile): initialize mobile app with auth and navigation"; delete branch. Design lens: begin with caregiver flows so every interaction feels obvious and delightful.  | M11  | Merged PR; passing CI| CI green; ≥1 approval; branch deleted| Frontend Dev | 0.25d  |

---

## Phase D – Data Layer & Offline Sync

| ID  | Title  | Description| Deps | Deliverables| Acceptance  | Role| Effort |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| G5  | Create feature branch – offline sync | Branch `feat/offline-sync` from `main`; open draft PR with checklist: WatermelonDB setup, sync engine, conflict resolution. Link to D1-D8 tasks. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.| G4   | Branch `feat/offline-sync`; draft PR| PR open; checklist visible| Frontend Dev | 0.1d   |
| D1  | Set up WatermelonDB  | Install @nozbe/watermelondb and dependencies; create database schema in `/apps/mobile/src/database/schema.ts` matching server schema (clients, visits, visit_documentation, medications, photos); configure SQLite adapter; add database initialization. Cite project-documentation/architecture-output.md – Local Database Schema (WatermelonDB). Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.   | G5   | WatermelonDB schema; database initialization | Database initializes; schema matches server; queries work; data persists | Frontend Dev | 2d|
| D2  | Implement WatermelonDB models| Create model classes for Client, Visit, VisitDocumentation, Medication, Photo with decorators (@model, @field, @relation, @children, @date, @json). Add sync_status field ('synced', 'pending', 'conflict') to all models. Implement model methods for common operations. Cite project-documentation/architecture-output.md – WatermelonDB Models. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.   | D1   | Model classes; model methods   | Models work with database; relations work; queries return correct data; tests ≥80% coverage | Frontend Dev | 2d|
| D3  | Implement local data access layer | Create repository pattern in `/apps/mobile/src/database/repositories/` for each model (ClientRepository, VisitRepository, etc.) with CRUD operations. Add query helpers for common patterns (getByZone, getByStatus, getRecent). Implement optimistic updates (update local immediately, queue for sync). Cite project-documentation/architecture-output.md – Offline-First Data Management. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.| D2   | Repository classes; query helpers | CRUD operations work; queries optimized; optimistic updates work; tests ≥80% coverage  | Frontend Dev | 2d|
| D4  | Implement sync queue | Create `/apps/mobile/src/services/sync/SyncQueue.ts` to track pending changes (create, update, delete operations). Store queue in WatermelonDB sync_queue table. Add methods: enqueue, dequeue, peek, clear. Implement priority queue (critical operations first). Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.  | D3   | SyncQueue class; sync_queue table | Operations enqueue correctly; dequeue in priority order; queue persists across app restarts | Frontend Dev | 1.5d   |
| D5  | Implement sync engine core| Create `/apps/mobile/src/services/sync/SyncEngine.ts` with sync() method: 1) Check connectivity, 2) Get pending changes from queue, 3) Push to server via POST /v1/sync/batch, 4) Get server changes since lastSyncTime, 5) Apply server changes to local DB, 6) Detect conflicts, 7) Resolve conflicts (last-write-wins), 8) Update lastSyncTime. Cite project-documentation/architecture-output.md – Sync Engine Architecture, Sync Conflict Resolution. Assumptions: Server timestamp is source of truth, conflicts logged to sync_log. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible. | D4   | SyncEngine class; sync() method| Sync pushes local changes; pulls server changes; resolves conflicts; updates sync time; tests cover all scenarios | Frontend Dev | 3d|
| D6  | Implement background sync | Configure expo-background-fetch to run sync every 15 minutes; register background task with TaskManager; handle background sync failures with exponential backoff (1min, 2min, 4min, 8min, 15min max). Add foreground sync trigger on app open and network reconnect. Cite project-documentation/architecture-output.md – Background Sync Setup. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.| D5   | Background sync task; foreground triggers    | Background sync runs every 15min; foreground sync triggers correctly; failures retry with backoff   | Frontend Dev | 2d|
| D7  | Implement auto-save for forms| Create useAutoSave hook with 1-second debounce; trigger save on field blur, navigation, app backgrounding. Save to local DB immediately, enqueue for sync. Add visual feedback (saving indicator, last saved timestamp). Cite project-documentation/architecture-output.md – Auto-Save Logic, Design Philosophy – Auto-Save over Manual Save. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.   | D6   | useAutoSave hook; saving indicators | Forms auto-save after 1s; save on blur/navigation/background; visual feedback shows; no data loss   | Frontend Dev | 1.5d   |
| D8  | Add sync status UI   | Create sync status badge component showing: "Synced" (green), "Syncing..." (blue), "Offline - X pending" (orange), "Sync Error" (red). Display in app header. Add pull-to-refresh on list screens to trigger manual sync. Cite project-documentation/architecture-output.md – Sync Status Indicator. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.  | D7   | Sync status badge; pull-to-refresh| Status badge shows correct state; updates in real-time; pull-to-refresh triggers sync  | Frontend Dev | 1d|
| G6  | Run CI, request review, merge PR – offline sync | Address CI findings; request ≥1 review; address feedback; squash-merge: "feat(mobile): implement offline-first sync with WatermelonDB"; delete branch. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.| D8   | Merged PR; passing CI  | CI green; ≥1 approval; branch deleted   | Frontend Dev | 0.25d  |

---

## Phase V – Visit Documentation Feature

| ID  | Title | Description| Deps | Deliverables   | Acceptance | Role| Effort |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| G7  | Create feature branch – visit documentation | Branch `feat/visit-documentation` from `main`; open draft PR with checklist: backend endpoints, mobile screens, GPS check-in, photo/annotation, comparison UI. Link to V1-V13 tasks. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.| G6   | Branch `feat/visit-documentation`; draft PR   | PR open; checklist visible    | Backend Dev  | 0.1d   |
| V1  | Implement backend visit endpoints| Create `/apps/backend/src/visits/routes.ts` with: POST /v1/visits (create), PATCH /v1/visits/:id (update), GET /v1/visits (list), GET /v1/visits/:id (detail). Implement controllers, services, validation (Joi schemas). Add business logic: GPS proximity check (100m), time window check (±30min), duplicate check. Cite project-documentation/architecture-output.md – Visit Documentation Endpoints, Visit Validation Rules. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.    | G7   | Visit routes; controllers; services; validation    | Endpoints work; validation enforces rules; GPS check works; tests ≥80% coverage | Backend Dev  | 3d|
| V2  | Implement smart data reuse endpoint | Create GET /v1/visits/:clientId/previous endpoint to fetch most recent completed visit for pre-filling. Implement logic: return vital_signs if <7 days old, activities if <30 days old, never return observations/concerns/signature. Include metadata (days_since_last_visit, confidence_level). Cite project-documentation/architecture-output.md – Smart Data Reuse Logic. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.| V1   | Previous visit endpoint; pre-fill logic | Endpoint returns correct data; age-based filtering works; metadata accurate; tests cover edge cases| Backend Dev  | 2d|
| V3  | Implement photo upload endpoints | Create POST /v1/visits/:visitId/photos/upload-url (generate pre-signed S3 URL, 15min expiry) and POST /v1/visits/:visitId/photos (confirm upload, process image: resize to 1200px width, compress to 70% quality, convert to JPEG, generate thumbnail). Use AWS SDK for S3 operations. Cite project-documentation/architecture-output.md – Photo Upload Endpoints. Assumptions: S3 bucket configured with lifecycle policy (archive after 90 days). Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.   | V2   | Photo upload endpoints; image processing| Pre-signed URLs work; images upload to S3; processing works; thumbnails generated; tests cover failures    | Backend Dev  | 2d|
| V4  | Implement client list screen (mobile)    | Create `/apps/mobile/src/features/clients/screens/ClientListScreen.tsx` with FlatList of client cards (name, address, last visit date, next scheduled visit). Add search bar, zone filter, pull-to-refresh. Implement virtualization (initialNumToRender: 10, windowSize: 5). Fetch from local DB, sync in background. Cite project-documentation/architecture-output.md – Client List Screen, design-documentation Cards. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.  | V3   | Client list screen; search; filters  | List displays clients; search works; filters work; pull-to-refresh syncs; performance <100ms render| Frontend Dev | 2d|
| V5  | Implement client detail screen (mobile)  | Create ClientDetailScreen with client info, care plan summary, medications, allergies, recent visits. Add "Start Visit" button. Fetch from local DB. Cite project-documentation/architecture-output.md – Client Detail Screen. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.  | V4   | Client detail screen; care plan display | Screen shows all client data; "Start Visit" navigates correctly; data loads from local DB | Frontend Dev | 1.5d   |
| V6  | Implement GPS check-in (mobile)  | Add expo-location dependency; request foreground permissions; implement check-in logic: get current location (high accuracy), calculate distance to client address (haversine formula), validate <100m, save check-in time and coordinates to local DB, update visit status to 'in_progress'. Show error if >100m with override option (requires coordinator approval). Cite project-documentation/architecture-output.md – GPS Check-In Implementation, Visit Validation Rules. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints. | V5   | GPS check-in logic; permission handling; distance validation  | Check-in works within 100m; error shows if too far; coordinates saved; visit status updates   | Frontend Dev | 2d|
| V7  | Implement visit documentation form (mobile) | Build VisitDocumentationScreen with section progress indicator, tabbed navigation (Vitals, Assessment, Interventions, Photos, Notes), voice-to-text shortcuts, and contextual helpers from the design spec. Implement auto-save (1s debounce), smart data reuse states (muted pre-fill, edited badges), inline change summaries, and offline-safe drafts. Cite Visit Documentation Design – Form Anatomy, Smart Data Reuse, Voice Input. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.| V6   | Documentation form; progress indicator; voice input; smart reuse styling | Progress indicator updates per section; voice-to-text inserts text across fields; copied data renders muted until edited; change badges display previous values; auto-save prevents data loss | Frontend Dev | 3d|
| V8  | Implement photo capture & annotation (mobile) | Add expo-camera and expo-image-picker; create PhotoCaptureScreen with camera, gallery import, and annotation tools (arrow, circle, text) plus wound measurement overlay. Optimize images (1200px width @70% JPEG), persist locally, queue uploads to S3, and surface comparison preview with previous visit photos. Cite Visit Documentation Design – Photo Workflow & Measurement Tools. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.| V7   | Photo capture screen; annotation tools; upload pipeline    | Camera and gallery flows work with gloves; annotations save and sync; measurement overlay captures dimensions; comparison preview shows previous photos; uploads resume after offline periods | Frontend Dev | 2.5d   |
| V9  | Implement signature capture (mobile)| Add react-native-signature-canvas; create SignatureScreen with canvas, "Clear" and "Save" buttons. Save signature as base64 PNG to local DB. Cite project-documentation/architecture-output.md – Signature Capture. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.  | V8   | Signature screen; canvas; save logic | Signature canvas works; clear works; signature saves; displays in review| Frontend Dev | 1d|
| V10 | Implement visit completion flow (mobile) | Add "Complete Visit" button that: validates all required fields filled, captures GPS check-out coordinates, calculates duration, updates visit status to 'completed', saves to local DB, enqueues for sync, shows success message, navigates to schedule. Add 5-second undo option. Cite project-documentation/architecture-output.md – Visit Completion Flow, Design Philosophy – Undo Over Confirm. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.  | V9   | Complete visit logic; validation; undo  | Completion validates fields; GPS captured; duration calculated; undo works within 5s; navigation correct   | Frontend Dev | 2d|
| V11 | Implement visit schedule screen (mobile) | Create ScheduleScreen with list of today's visits (scheduled, in_progress, completed). Group by status. Add date picker to view other days. Implement pull-to-refresh. Tap visit to navigate to detail/documentation. Cite project-documentation/architecture-output.md – Schedule Screen. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints. | V10  | Schedule screen; date picker; status groups   | Schedule displays visits; date picker works; status grouping correct; navigation works  | Frontend Dev | 2d|
| V12 | Implement change review & comparison UI  | Add comparison view within documentation review that surfaces side-by-side “Today vs Last Visit” vitals, highlights increases/decreases, and summarizes copied vs edited fields. Include “Show trend” link with sparkline, and conflict banner when server data changes mid-visit. Cite Smart Data Reuse Design – Comparison View. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.| V7   | Comparison panel; change indicators; trend view    | Side-by-side comparison renders with delta badges; users can toggle comparison per section; conflict banner appears when needed; analytics event logged on comparison usage| Frontend Dev | 2d|
| V13 | Add visit documentation tests    | Write integration tests for complete visit flow: check-in → document → photo/annotation → signature → check-out. Test offline scenario (5 visits), conflict resolution, smart data reuse styling, and comparison view toggles. Cite project-documentation/architecture-output.md – Testing Strategy. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.  | V12  | Integration tests; offline tests; comparison tests | All tests pass; voice input + annotations covered; conflict resolution verified; coverage ≥80%| Frontend Dev | 2.5d   |
| G8  | Run CI, request review, merge PR – visit documentation | Address CI findings; request ≥2 reviews (backend + frontend leads); address feedback; squash-merge: "feat: implement visit documentation with GPS check-in and offline support"; delete branch. Design lens: remove every bit of visit friction, reuse smart defaults, and polish voice-first touchpoints.| V13  | Merged PR; passing CI   | CI green; ≥2 approvals; branch deleted| Backend Dev  | 0.25d  |

---

## Phase C – Care Coordination Feature

| ID  | Title    | Description | Deps | Deliverables | Acceptance | Role| Effort |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------ | ------ |
| G9  | Create feature branch – care coordination | Branch `feat/care-coordination` from `main`; open draft PR with checklist: Twilio integration, alert endpoints, push notifications, mobile UI. Link to C1-C8 tasks. Design lens: alerts should feel like one-tap superpowers with seamless voice and push. | G8   | Branch `feat/care-coordination`; draft PR   | PR open; checklist visible    | Backend Dev  | 0.1d   |
| C1  | Set up Twilio account and integration  | Create Twilio account; purchase phone number (Canadian); configure account SID and auth token in environment variables; install twilio SDK; create helpers in `/apps/backend/src/twilio/voice-service.ts` and `/apps/backend/src/twilio/sms-service.ts`. Test with sample call/SMS. Cite project-documentation/architecture-output.md – Communication Services, Twilio Integration. Assumptions: Twilio account budget $100/month. Design lens: alerts should feel like one-tap superpowers with seamless voice and push. | G9   | Twilio account; phone number; SDK integration; helper functions   | Test call/SMS works; credentials secured; helpers functional   | Backend Dev  | 1d|
| C2  | Implement alert endpoints (backend)    | Create `/apps/backend/src/alerts/routes.ts` with: POST /v1/alerts (create alert, trigger notifications), GET /v1/alerts (list alerts with filters), PATCH /v1/alerts/:id/read (mark as read). Implement alert service with notification logic: identify coordinator, send push notification, log alert. Cite project-documentation/architecture-output.md – Care Coordination Endpoints. Design lens: alerts should feel like one-tap superpowers with seamless voice and push.  | C1   | Alert routes; controllers; services| Endpoints work; alerts created; notifications sent; tests ≥80% coverage | Backend Dev  | 2d|
| C3  | Implement voice alert logic (backend)  | Enhance alert service to initiate Twilio voice call when urgency is 'critical': call coordinator, play voice message (TwiML), if no answer after 30s send SMS backup, if still no response after 5min escalate to backup coordinator. Add webhook endpoint POST /v1/twilio/call-status to track call outcomes. Cite project-documentation/architecture-output.md – Voice Alert Logic. Design lens: alerts should feel like one-tap superpowers with seamless voice and push.  | C2   | Voice call logic; TwiML generation; escalation; webhook| Critical alerts trigger voice call; SMS backup works; escalation works; call status tracked   | Backend Dev  | 2d|
| C4  | Set up Expo Push Notifications | Configure Expo push notification credentials in app.json; install expo-notifications; implement push token registration endpoint POST /v1/users/push-token; create notification service in `/apps/backend/src/alerts/notifications.ts` using Expo Push API. Test push notification delivery. Cite project-documentation/architecture-output.md – Push Notifications. Design lens: alerts should feel like one-tap superpowers with seamless voice and push.| C3   | Push notification setup; token registration; notification service | Push tokens register; notifications send; delivery tracked| Backend Dev  | 1.5d   |
| C5  | Implement alert creation screen (mobile)  | Create AlertScreen with: client selector, urgency picker (low, medium, high, critical), category picker (medical, safety, behavioral, other), message input (multiline, voice-to-text option), recipient selector (default: all team), "Send Alert" button. Save to local DB, send immediately if online, queue if offline. Cite project-documentation/architecture-output.md – Alert Creation, design-documentation Forms. Design lens: alerts should feel like one-tap superpowers with seamless voice and push.  | C4   | Alert creation screen; form validation; send logic  | Screen displays all fields; validation works; alerts send online; queue offline; voice input works | Frontend Dev | 2d|
| C6  | Implement floating alert button (mobile)  | Add floating action button (FAB) on visit documentation screen (bottom-right, 56pt diameter, red background, alert icon). Tap opens AlertScreen with client pre-selected. Always visible, high z-index. Cite Design Philosophy – One-tap voice alert to coordinator. Design lens: alerts should feel like one-tap superpowers with seamless voice and push.  | C5   | Floating alert button; navigation| FAB visible on documentation screen; tap opens alert screen; client pre-selected| Frontend Dev | 0.5d   |
| C7  | Implement alerts list screen (mobile)  | Create AlertsListScreen with list of alerts (grouped by date, sorted by urgency). Show: client name, urgency badge, category, message preview, timestamp, read status. Tap to view full alert. Add filter: unread only. Pull-to-refresh syncs. Cite project-documentation/architecture-output.md – Alerts List Screen. Design lens: alerts should feel like one-tap superpowers with seamless voice and push.    | C6   | Alerts list screen; grouping; filters  | List displays alerts; grouping correct; filters work; tap shows detail; pull-to-refresh syncs | Frontend Dev | 2d|
| C8  | Implement push notification handling (mobile)   | Configure expo-notifications to handle incoming notifications: show notification when app in background, navigate to alert detail when tapped, update badge count. Request notification permissions on first launch. Cite project-documentation/architecture-output.md – Push Notification Handling. Design lens: alerts should feel like one-tap superpowers with seamless voice and push.| C7   | Notification handling; permissions; navigation | Notifications display; tap navigates correctly; badge updates; permissions requested | Frontend Dev | 1.5d   |
| G10 | Run CI, request review, merge PR – care coordination | Address CI findings; request ≥2 reviews; address feedback; squash-merge: "feat: implement care coordination with voice alerts and push notifications"; delete branch. Design lens: alerts should feel like one-tap superpowers with seamless voice and push.  | C8   | Merged PR; passing CI | CI green; ≥2 approvals; branch deleted   | Backend Dev  | 0.25d  |

---

## Phase F – Family Portal (SMS-First)

| ID  | Title   | Description | Deps | Deliverables| Acceptance| Role| Effort |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| G11 | Create feature branch – family portal  | Branch `feat/family-portal` from `main`; open draft PR with checklist: family member management, SMS service, daily messages, reply processing. Link to F1-F6 tasks. Design lens: provide proactive SMS reassurance with zero complexity for families.   | G10  | Branch `feat/family-portal`; draft PR   | PR open; checklist visible| Backend Dev  | 0.1d   |
| F1  | Implement family member management (backend)| Create `family_members` table (id, client_id, name, relationship, phone, notification_level: 'daily'/'weekly'/'none', opted_in, created_at). Add endpoints: POST /v1/clients/:id/family-members (add), GET /v1/clients/:id/family-members (list), PATCH /v1/family-members/:id (update), DELETE /v1/family-members/:id (remove). Cite project-documentation/architecture-output.md – Family Portal. Design lens: provide proactive SMS reassurance with zero complexity for families. | G11  | Family members table; CRUD endpoints| Table created; endpoints work; validation enforces phone format; tests ≥80% coverage| Backend Dev  | 2d|
| F2  | Implement daily SMS message generation | Create `/apps/backend/src/family/message-sender.ts` with generateFamilyMessage() function: query today's completed visits for client, generate personalized message based on visit data (positive routine vs concern identified), include reply keywords (CALL, DETAILS, PLAN). Cite project-documentation/architecture-output.md – Family SMS Logic, generateFamilyMessage(). Design lens: provide proactive SMS reassurance with zero complexity for families.| F1   | SMS generation service; message templates    | Messages generate correctly; personalization works; keywords included; tests cover all scenarios | Backend Dev  | 2d|
| F3  | Implement daily SMS cron job  | Create cron job (node-cron) that runs daily at 6 PM: query all family members with notification_level='daily' and opted_in=true, generate message for each, send via Twilio SMS, log to communications table. Add manual trigger endpoint POST /v1/admin/send-daily-sms for testing. Cite project-documentation/architecture-output.md – Daily 6 PM Messages. Design lens: provide proactive SMS reassurance with zero complexity for families.   | F2   | Cron job; manual trigger endpoint | Cron runs at 6 PM; messages send; logging works; manual trigger works for testing   | Backend Dev  | 1.5d   |
| F4  | Implement SMS reply processing| Create webhook endpoint POST /v1/twilio/sms-reply to receive incoming SMS from Twilio; parse message for keywords (CALL, DETAILS, PLAN); route to appropriate handler: CALL creates callback task for coordinator, DETAILS sends expanded visit info, PLAN sends care plan summary. Log all replies. Cite project-documentation/architecture-output.md – Reply Keyword Processing. Design lens: provide proactive SMS reassurance with zero complexity for families.    | F3   | SMS reply webhook; keyword parsing; handlers | Webhook receives SMS; keywords detected; handlers work; replies send within 30s; logging works | Backend Dev  | 2d|
| F5  | Implement family member management UI (mobile - coordinator only) | Create FamilyMembersScreen (coordinator role only) with list of family members for client, "Add Family Member" button, edit/delete options. Form fields: name, relationship, phone, notification level. Cite project-documentation/architecture-output.md – Family Member Management. Design lens: provide proactive SMS reassurance with zero complexity for families. | F4   | Family members screen; CRUD UI | Screen displays family members; add/edit/delete works; validation enforces rules; coordinator-only access | Frontend Dev | 2d|
| F6  | Add family portal documentation  | Create `/docs/family-portal.md` with: setup instructions, message templates, keyword reference, opt-in/opt-out process, compliance notes (TCPA, CASL). Design lens: provide proactive SMS reassurance with zero complexity for families.| F5   | Family portal documentation    | Docs complete; templates documented; compliance notes included| Backend Dev  | 0.5d   |
| G12 | Run CI, request review, merge PR – family portal    | Address CI findings; request ≥1 review; address feedback; squash-merge: "feat: implement SMS-first family portal with daily updates"; delete branch. Design lens: provide proactive SMS reassurance with zero complexity for families.| F6   | Merged PR; passing CI  | CI green; ≥1 approval; branch deleted| Backend Dev  | 0.25d  |

---

## Phase DB – Data Bridge Enablement

| ID  | Title | Description  | Deps | Deliverables| Acceptance  | Role| Effort |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| G13 | Create feature branch – data bridge enablement | Branch `feat/data-bridge` from `main`; open draft PR with checklist: import pipeline, admin review UI, exports, monitoring. Link to DB1-DB6 tasks. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.   | G12  | Branch `feat/data-bridge`; draft PR    | PR open; checklist visible| Backend Dev  | 0.1d   |
| DB1 | Scaffold data bridge service| Create `/apps/backend/src/data-bridge/` module with shared validators, file storage helpers, and feature flag. Configure S3 buckets, EventBridge bus, and secrets in Terraform staging. Cite Architecture Blueprint – Data Bridge Service. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible. | G13  | Data bridge module; Terraform resources; feature flag toggle | Infrastructure deployed; module compiled; feature flag default off; Terraform plan/apply clean | DevOps  | 1.5d   |
| DB2 | Implement CSV import pipeline    | Implement presigned-upload endpoint, EventBridge trigger, and worker that validates CSV with Ajv, normalizes rows, detects duplicates, upserts clients in transaction, and records warnings/errors to `data_bridge_import_audit`. Add unit/integration tests. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible. | DB1  | Upload endpoint; worker; audit table; tests    | CSV uploads processed end-to-end; invalid rows reported; duplicate detection logged; tests ≥80% coverage    | Backend Dev  | 3d|
| DB3 | Build import review UI   | Create lightweight admin web app (`apps/admin`) with drag-and-drop CSV upload, preview of ready/warning/error rows, and import action. Integrate with backend endpoints and feature flag. Cite Data Bridge Design – Import Flow. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.   | DB2  | Admin web app; upload UI; preview table| Drag-and-drop works; preview matches server responses; accessibility (keyboard + screen reader) verified; build passes CI | Frontend Dev | 2.5d   |
| DB4 | Implement daily export job  | Add scheduled worker (node-cron) that aggregates completed visits at 18:00 local, renders PDF + CSV (using handlebars + puppeteer), stores artifacts in S3, emails coordinators via Postmark, and retries with exponential backoff. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.| DB2  | Export job; PDF/CSV templates; email delivery  | Job runs on schedule; sample email delivered; retries logged; artifacts stored with lifecycle policy| Backend Dev  | 2d|
| DB5 | Implement manual export endpoint | Create GET `/v1/data-bridge/exports` streaming endpoint with date range + format filters using cursor-based batching (5k rows). Enforce RBAC for admins, log requests for compliance, and surface progress indicator in admin app. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible. | DB4  | Streaming endpoint; admin UI integration; audit log | Large exports complete without memory spikes; RBAC enforced; audit log records request metadata; admin UI shows progress  | Backend Dev  | 1.5d   |
| DB6 | Add monitoring & documentation   | Instrument import/export pipelines with metrics (success/failure counts, durations), CloudWatch alarms, and Sentry breadcrumbs. Update `/docs/architecture.md` & `/docs/data-bridge.md` with runbooks and guardrails. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.| DB5  | Metrics dashboards; alarms; documentation | Metrics visible; alarms fire on simulated failure; docs include troubleshooting steps; runbook approved by DevOps| DevOps  | 1d|
| G14 | Run CI, request review, merge PR – data bridge | Address CI findings; request ≥2 reviews (backend + DevOps); address feedback; squash-merge: "feat: enable data bridge imports/exports"; delete branch. Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.  | DB6  | Merged PR; passing CI    | CI green; ≥2 approvals; branch deleted | Backend Dev  | 0.25d  |

---

## Phase S – Security Hardening

| ID  | Title| Description| Deps | Deliverables    | Acceptance | Role| Effort |
| --- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------ | ------ |
| G15 | Create feature branch – security hardening | Branch `feat/security-hardening` from `main`; open draft PR with checklist: encryption, audit logging, security headers, penetration testing. Link to S1-S8 tasks. Design lens: make security invisible but uncompromising in detail.   | G14  | Branch `feat/security-hardening`; draft PR | PR open; checklist visible  | Backend Dev  | 0.1d   |
| S1  | Implement field-level encryption| Add crypto module for sensitive field encryption (AES-256-GCM); encrypt fields before database storage: SSN (if collected), detailed medical diagnoses, sensitive personal notes. Store encryption key in AWS Secrets Manager, not environment variables. Cite project-documentation/architecture-output.md – Field-Level Encryption. Assumptions: Encryption key rotated every 90 days. Design lens: make security invisible but uncompromising in detail. | G15  | Encryption module; key management| Sensitive fields encrypted at rest; decryption works; key stored securely; tests verify encryption    | Backend Dev  | 2d|
| S2  | Implement comprehensive audit logging   | Create audit_log table (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, timestamp). Log all create/update/delete operations on: clients, visits, medications, care plans, alerts. Add middleware to capture request context. Cite project-documentation/architecture-output.md – Audit Trails. Design lens: make security invisible but uncompromising in detail.    | S1   | Audit log table; logging middleware   | All CUD operations logged; context captured; logs queryable; retention policy configured (7 years)    | Backend Dev  | 2d|
| S3  | Enhance security headers   | Configure helmet.js with strict CSP, HSTS (max-age 31536000, includeSubDomains), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin. Add security.txt file. Cite project-documentation/architecture-output.md – Security Headers. Design lens: make security invisible but uncompromising in detail. | S2   | Enhanced helmet config; security.txt  | Security headers present on all responses; CSP enforced; HSTS works; security.txt accessible | Backend Dev  | 1d|
| S4  | Implement rate limiting per user| Enhance rate limiting to track per user ID (not just IP): 100 requests/minute per user, 1000 requests/15min per user. Store counters in Redis. Add rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset). Cite project-documentation/architecture-output.md – Rate Limiting. Design lens: make security invisible but uncompromising in detail.  | S3   | Per-user rate limiting; Redis counters; headers| Rate limits enforced per user; headers present; Redis stores counters; tests verify limits | Backend Dev  | 1.5d   |
| S5  | Implement SQL injection prevention | Review all database queries; ensure parameterized queries used everywhere (no string concatenation); add SQL injection tests; run SQLMap against API endpoints. Cite project-documentation/architecture-output.md – Security Testing, SQL Injection Prevention. Design lens: make security invisible but uncompromising in detail.| S4   | Query review; parameterized queries; SQLMap report  | All queries parameterized; SQLMap finds no vulnerabilities; tests pass | Backend Dev  | 1d|
| S6  | Implement XSS prevention   | Add DOMPurify to sanitize user input on frontend; configure CSP to prevent inline scripts; add XSS tests; run XSS scanner against app. Cite project-documentation/architecture-output.md – XSS Prevention. Design lens: make security invisible but uncompromising in detail. | S5   | Input sanitization; CSP config; XSS tests| User input sanitized; CSP blocks inline scripts; XSS scanner finds no vulnerabilities   | Frontend Dev | 1d|
| S7  | Implement CSRF protection  | Add CSRF tokens to all state-changing requests; configure SameSite=Strict on cookies; add CSRF tests. Cite project-documentation/architecture-output.md – CSRF Protection. Design lens: make security invisible but uncompromising in detail.| S6   | CSRF tokens; cookie config; tests| CSRF tokens validated; cookies configured; tests pass| Backend Dev  | 1d|
| S8  | Conduct security audit | Run OWASP ZAP automated scan; review findings; fix critical/high vulnerabilities; document medium/low for future sprints. Generate security audit report. Cite project-documentation/architecture-output.md – Security Testing. Design lens: make security invisible but uncompromising in detail.  | S7   | OWASP ZAP report; vulnerability fixes; audit report | Critical/high vulnerabilities fixed; report documents findings; remediation plan for remaining issues | Backend Dev  | 2d|
| G16 | Run CI, request review, merge PR – security hardening | Address CI findings; request ≥2 reviews (backend lead + security reviewer); address feedback; squash-merge: "feat: implement security hardening with encryption and audit logging"; delete branch. Design lens: make security invisible but uncompromising in detail. | S8   | Merged PR; passing CI| CI green; ≥2 approvals; branch deleted | Backend Dev  | 0.25d  |

---

## Phase T – Testing & Quality Assurance

| ID  | Title| Description    | Deps | Deliverables  | Acceptance| Role| Effort |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------- | ------ |
| T1  | Write backend integration tests  | Create integration test suite for all API endpoints using Supertest; test happy paths, error cases, edge cases; achieve ≥80% code coverage. Tests run in CI. Cite project-documentation/architecture-output.md – API Integration Tests. Design lens: test real workflows to guarantee the experience stays intuitive and resilient.   | G16  | Integration test suite; coverage report   | All endpoints tested; coverage ≥80%; tests pass in CI | Backend Dev | 3d|
| T2  | Write mobile E2E tests  | Create Detox E2E test suite for critical flows: activation + biometric unlock, complete visit (check-in → document → photo/annotation → signature → check-out), send alert, view schedule. Tests run on iOS simulator and Android emulator. Cite project-documentation/architecture-output.md – Mobile E2E Tests. Design lens: test real workflows to guarantee the experience stays intuitive and resilient. | T1   | Detox test suite; test configs   | Critical flows tested; tests pass on iOS and Android; tests run in CI  | Frontend Dev| 3d|
| T3  | Conduct offline testing | Test app in airplane mode: complete 5 visits offline, verify saved locally, come online, verify all sync correctly. Test extended offline (8 hours, 10 visits). Test conflict resolution (2 devices edit same visit offline). Document findings. Cite project-documentation/architecture-output.md – Offline Functionality Tests. Design lens: test real workflows to guarantee the experience stays intuitive and resilient.    | T2   | Offline test report; bug fixes   | Offline flow works; extended offline works; conflicts resolve correctly; no data loss| QA  | 2d|
| T4  | Conduct performance testing| Run load tests with k6: 100 concurrent users (normal load), 500 concurrent users (peak load), 1000 users sync storm. Measure API response times (target: <2s), database query times, sync completion times. Generate performance report. Cite project-documentation/architecture-output.md – Performance Testing, Load Test Scenarios. Design lens: test real workflows to guarantee the experience stays intuitive and resilient.  | T3   | k6 test scripts; performance report | Normal load: <2s response, 0% errors; Peak load: <3s response, <1% errors; Sync storm: all complete within 5min | DevOps | 2d|
| T5  | Conduct accessibility testing| Test app with VoiceOver (iOS) and TalkBack (Android); test with 200% text size; test with high contrast mode; test with reduced motion; test keyboard navigation; verify WCAG 2.1 AA compliance. Document findings and fixes. Cite WCAG Compliance Guide. Design lens: test real workflows to guarantee the experience stays intuitive and resilient.  | T4   | Accessibility test report; fixes | VoiceOver/TalkBack work; large text works; high contrast works; keyboard navigation works; WCAG AA compliant    | QA  | 2d|
| T6  | Conduct security penetration testing  | Hire external security firm to conduct penetration test; provide API documentation and test accounts; review findings; fix critical/high vulnerabilities; document medium/low for future sprints. Generate penetration test report. Cite project-documentation/architecture-output.md – Security Testing. Assumptions: Budget $5,000 for external pentest. Design lens: test real workflows to guarantee the experience stays intuitive and resilient. | T5   | Penetration test report; vulnerability fixes   | Critical/high vulnerabilities fixed; report documents findings; remediation plan for remaining issues| Security    | 5d|
| T7  | Conduct user acceptance testing (UAT) | Recruit 5 caregivers for UAT; provide test accounts and test clients; observe users completing tasks: login, view schedule, complete visit, send alert; collect feedback via survey (SUS, NPS); document usability issues. Cite design-documentation Success Metrics. Design lens: test real workflows to guarantee the experience stays intuitive and resilient.| T6   | UAT report; usability findings; SUS/NPS scores | 5 caregivers complete UAT; SUS >80; NPS >50; usability issues documented    | QA  | 3d|
| T8  | Fix critical bugs from testing   | Prioritize and fix all critical bugs found in T1-T7; re-test to verify fixes; update tests to prevent regressions. Design lens: test real workflows to guarantee the experience stays intuitive and resilient.    | T7   | Bug fixes; regression tests | All critical bugs fixed; regression tests pass; no new bugs introduced | Backend Dev, Frontend Dev | 3d|

---

## Phase P – Production Deployment

| ID  | Title | Description  | Deps | Deliverables | Acceptance  | Role| Effort |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------ | ------ |
| P1  | Set up production AWS infrastructure | Provision production AWS resources in ca-central-1: RDS PostgreSQL 15 (db.t3.medium, Multi-AZ), ElastiCache Redis 7 (cache.t3.medium, cluster mode), S3 bucket with versioning and encryption, ECS Fargate cluster (2 tasks, auto-scaling 2-10), Application Load Balancer, CloudFront CDN, Route53 DNS (api.berthcare.ca). Use Terraform. Cite project-documentation/architecture-output.md – Infrastructure. Assumptions: Production budget $1,000/month. Design lens: automate deployments so operations fade into the background. | T8   | Terraform configs in `/infra/terraform/environments/production`; provisioned resources | `terraform apply` succeeds; resources accessible; costs within budget; Multi-AZ configured| DevOps  | 3d|
| P2  | Configure production secrets| Store secrets in AWS Secrets Manager: database credentials, Redis password, JWT secret, encryption key, Twilio credentials, S3 access keys. Configure ECS tasks to fetch secrets at runtime. Rotate secrets and verify app still works. Cite project-documentation/architecture-output.md – Secrets Management. Design lens: automate deployments so operations fade into the background.   | P1   | Secrets in Secrets Manager; ECS task config| Secrets stored securely; ECS tasks fetch secrets; rotation works; app functions correctly | DevOps  | 1d|
| P3  | Set up production monitoring| Configure CloudWatch alarms: API error rate >1%, API p95 latency >2s, database CPU >80%, Redis memory >80%, ECS task failures. Set up PagerDuty integration for critical alerts. Create production dashboard with key metrics. Cite project-documentation/architecture-output.md – Monitoring. Design lens: automate deployments so operations fade into the background. | P2   | CloudWatch alarms; PagerDuty integration; dashboard| Alarms trigger correctly; PagerDuty notifies on-call; dashboard displays metrics | DevOps  | 1.5d   |
| P4  | Set up production logging   | Configure CloudWatch Logs with log retention (90 days for application logs, 7 years for audit logs). Set up log aggregation and search. Configure Sentry for production error tracking with source maps. Cite project-documentation/architecture-output.md – Logging. Design lens: automate deployments so operations fade into the background. | P3   | CloudWatch Logs config; Sentry production project  | Logs stream to CloudWatch; retention configured; Sentry captures errors; source maps work | DevOps  | 1d|
| P5  | Implement database backup and recovery    | Configure automated RDS backups (daily, 30-day retention); test point-in-time recovery; document recovery procedures in runbook. Set up backup monitoring alerts. Cite project-documentation/architecture-output.md – Backup & Recovery. Design lens: automate deployments so operations fade into the background.| P4   | Backup config; recovery test; runbook | Backups run daily; recovery test succeeds; runbook complete; alerts configured   | DevOps  | 1.5d   |
| P6  | Set up CI/CD pipeline for production | Enhance GitHub Actions workflow to deploy to production on tag push (v*.*.\*): run tests, build Docker images, push to ECR, update ECS service, run smoke tests, rollback on failure. Require manual approval for production deploy. Cite project-documentation/architecture-output.md – CI/CD. Design lens: automate deployments so operations fade into the background.| P5   | Production deploy workflow; smoke tests; rollback logic | Tag push triggers deploy; smoke tests run; rollback works; manual approval required | DevOps  | 2d|
| P7  | Build and deploy backend to production    | Tag release v1.0.0; trigger production deploy; monitor deployment; verify health checks pass; run smoke tests (login, create visit, sync). Monitor for 24 hours. Design lens: automate deployments so operations fade into the background.  | P6   | Backend deployed to production; smoke tests pass   | Backend accessible at api.berthcare.ca; health checks pass; smoke tests pass; no errors in 24h | DevOps  | 1d|
| P8  | Build and submit mobile app to app stores | Build production iOS app with Expo EAS Build; submit to App Store Connect for review; build production Android app; submit to Google Play Console for review. Provide app store metadata (description, screenshots, privacy policy). Cite project-documentation/architecture-output.md – Mobile App Deployment. Assumptions: Apple Developer account ($99/year), Google Play Developer account ($25 one-time). Design lens: automate deployments so operations fade into the background.  | P7   | iOS IPA; Android APK/AAB; app store submissions    | iOS app submitted to App Store; Android app submitted to Play Store; metadata complete| Frontend Dev | 2d|
| P9  | Create production runbook   | Document production operations: deployment process, rollback procedure, database recovery, incident response, on-call rotation, escalation paths, common issues and solutions. Store in `/docs/runbook.md`. Design lens: automate deployments so operations fade into the background.| P8   | Production runbook| Runbook complete; procedures documented; team trained | DevOps  | 1d|
| P10 | Conduct production smoke testing | After app store approval, download production apps; test critical flows on real devices: login, complete visit, send alert, sync offline data. Verify push notifications, SMS, voice calls work. Monitor production metrics. Design lens: automate deployments so operations fade into the background.   | P9   | Smoke test report | All critical flows work; notifications work; SMS/voice work; metrics healthy| QA| 1d|

---

## Phase L – Launch Preparation

| ID  | Title| Description | Deps | Deliverables| Acceptance   | Role| Effort |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------- | ------ |
| L1  | Create user documentation  | Write user guides: caregiver guide (login, complete visit, send alert), coordinator guide (manage team, review visits, respond to alerts), admin guide (manage users, configure settings). Include screenshots and videos. Store in `/docs/user-guides/`. Design lens: communicate essentials clearly—no manuals, just confidence. | P10  | User guides; screenshots; videos  | Guides complete; screenshots clear; videos <3min each  | QA  | 2d|
| L2  | Create training materials  | Develop training presentation (PowerPoint/Keynote); create training video (15-20 minutes); prepare hands-on exercises with test accounts. Cite design-documentation Success Metrics (training time <2 hours). Design lens: communicate essentials clearly—no manuals, just confidence. | L1   | Training presentation; training video; exercises| Materials complete; video <20min; exercises cover all features | QA  | 2d|
| L3  | Conduct team training| Train internal team (5 people): product, support, sales. Walk through app features, common issues, escalation procedures. Collect feedback. Design lens: communicate essentials clearly—no manuals, just confidence. | L2   | Training session; feedback report | Team trained; feedback collected; issues documented| PM  | 1d|
| L4  | Conduct pilot with 5 caregivers | Recruit 5 caregivers for 2-week pilot; provide training; monitor usage; collect feedback via daily check-ins and exit survey; document issues and feature requests. Cite design-documentation User Testing. Design lens: communicate essentials clearly—no manuals, just confidence.   | L3   | Pilot report; usage metrics; feedback; issues   | 5 caregivers complete pilot; usage metrics collected; feedback documented| PM  | 10d    |
| L5  | Fix pilot feedback issues  | Prioritize and fix critical issues from pilot; implement quick wins (UI tweaks, copy changes); document feature requests for future sprints. Design lens: communicate essentials clearly—no manuals, just confidence.| L4   | Bug fixes; UI improvements| Critical issues fixed; quick wins implemented; feature requests documented   | Backend Dev, Frontend Dev | 3d|
| L6  | Create marketing materials | Design app store screenshots (5 per platform); write app store description; create landing page at berthcare.ca; prepare press release; create social media posts. Design lens: communicate essentials clearly—no manuals, just confidence.| L5   | App store assets; landing page; press release   | Screenshots designed; description written; landing page live; press release ready | PM  | 2d|
| L7  | Set up customer support| Configure support email (support@berthcare.ca); set up ticketing system (Zendesk or similar); create support knowledge base with FAQs; train support team. Design lens: communicate essentials clearly—no manuals, just confidence.| L6   | Support email; ticketing system; knowledge base | Support email works; tickets route correctly; knowledge base published | PM  | 1.5d   |
| L8  | Plan phased rollout  | Create rollout plan: Week 1 (10 users), Week 2 (25 users), Week 3 (50 users), Week 4 (100 users), Week 5+ (open to all). Define success criteria for each phase. Set up monitoring dashboard for rollout metrics. Design lens: communicate essentials clearly—no manuals, just confidence.| L7   | Rollout plan; success criteria; monitoring dashboard | Plan documented; criteria defined; dashboard ready | PM  | 1d|

---

## Phase R – Launch & Post-Launch

| ID  | Title | Description| Deps | Deliverables| Acceptance  | Role | Effort  |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------- | ----------------------------------------------------------------------------- | ---- | ------- |
| R1  | Launch Week 1 (10 users)| Invite 10 pilot caregivers; monitor usage daily; respond to support tickets within 4 hours; collect feedback; fix critical bugs immediately. Success criteria: >80% daily active users, <5 critical bugs, SUS >75. Design lens: run focused rollouts, iterate fast, and perfect every detail before scaling.| L8   | Week 1 metrics report    | 10 users onboarded; metrics meet criteria; bugs fixed; feedback collected| PM   | 5d |
| R2  | Launch Week 2 (25 users)| Invite 15 more caregivers (total 25); continue monitoring; respond to support tickets; collect feedback. Success criteria: >75% daily active users, <3 critical bugs, SUS >78. Design lens: run focused rollouts, iterate fast, and perfect every detail before scaling.| R1   | Week 2 metrics report    | 25 users active; metrics meet criteria; bugs fixed; feedback collected   | PM   | 5d |
| R3  | Launch Week 3 (50 users)| Invite 25 more caregivers (total 50); monitor performance under increased load; scale infrastructure if needed; respond to support tickets. Success criteria: >70% daily active users, <2 critical bugs, SUS >80. Design lens: run focused rollouts, iterate fast, and perfect every detail before scaling. | R2   | Week 3 metrics report    | 50 users active; metrics meet criteria; infrastructure scaled; bugs fixed| PM   | 5d |
| R4  | Launch Week 4 (100 users)   | Invite 50 more caregivers (total 100); monitor performance; ensure infrastructure handles load; respond to support tickets. Success criteria: >70% daily active users, <2 critical bugs, SUS >80, API p95 <2s. Design lens: run focused rollouts, iterate fast, and perfect every detail before scaling.    | R3   | Week 4 metrics report    | 100 users active; metrics meet criteria; performance targets met; bugs fixed  | PM   | 5d |
| R5  | Open launch (all users) | Open app to all users; announce via email, social media, press release; monitor metrics; respond to support tickets; scale infrastructure as needed. Success criteria: >60% daily active users, <1 critical bug/week, SUS >80, NPS >50. Design lens: run focused rollouts, iterate fast, and perfect every detail before scaling. | R4   | Launch announcement; metrics dashboard | App open to all; announcement sent; metrics meet criteria; support responsive | PM   | Ongoing |
| R6  | Post-launch monitoring (30 days) | Monitor production metrics daily: active users, visit completion rate, sync success rate, error rate, API performance, support ticket volume. Generate weekly reports. Identify issues and feature requests for next sprint. Design lens: run focused rollouts, iterate fast, and perfect every detail before scaling. | R5   | Weekly reports (4 weeks) | Metrics monitored; reports generated; issues identified; next sprint planned  | PM   | 20d|

---

## Dependency-Ordered Task List

1. E1 (Initialize Git repository)
2. E2 (Set up CI bootstrap)
3. E3 (Configure monorepo structure)
4. E4 (Set up local development environment)
5. E5 (Configure AWS infrastructure (staging))
6. E6 (Set up monitoring and logging)
7. E7 (Update architecture docs – Infrastructure)
8. G1 (Create feature branch – backend foundation)
9. B1 (Initialize backend application)
10. B2 (Design and implement database schema)
11. B3 (Implement database connection pool)
12. B4 (Implement Redis cache layer)
13. B5 (Implement activation initiation endpoint)
14. B6 (Implement activation completion & device sessions)
15. B7 (Implement authorization middleware)
16. B8 (Implement error handling middleware)
17. B9 (Implement API versioning and base routes)
18. B10 (Implement session refresh & revocation endpoints)
19. G2 (Run CI, request review, merge PR – backend foundation)
20. G3 (Create feature branch – mobile foundation)
21. M1 (Initialize React Native app with Expo)
22. M2 (Set up design system tokens)
23. M3 (Implement core UI components)
24. M4 (Set up navigation structure)
25. M5 (Implement global state management)
26. M6 (Implement API client)
27. M7 (Implement activation experience)
28. M8 (Implement biometric + PIN enrollment)
29. M9 (Implement protected route wrapper)
30. M10 (Implement offline detection)
31. M11 (Add app launch performance optimization)
32. G4 (Run CI, request review, merge PR – mobile foundation)
33. G5 (Create feature branch – offline sync)
34. D1 (Set up WatermelonDB)
35. D2 (Implement WatermelonDB models)
36. D3 (Implement local data access layer)
37. D4 (Implement sync queue)
38. D5 (Implement sync engine core)
39. D6 (Implement background sync)
40. D7 (Implement auto-save for forms)
41. D8 (Add sync status UI)
42. G6 (Run CI, request review, merge PR – offline sync)
43. G7 (Create feature branch – visit documentation)
44. V1 (Implement backend visit endpoints)
45. V2 (Implement smart data reuse endpoint)
46. V3 (Implement photo upload endpoints)
47. V4 (Implement client list screen (mobile))
48. V5 (Implement client detail screen (mobile))
49. V6 (Implement GPS check-in (mobile))
50. V7 (Implement visit documentation form (mobile))
51. V8 (Implement photo capture & annotation (mobile))
52. V9 (Implement signature capture (mobile))
53. V10 (Implement visit completion flow (mobile))
54. V11 (Implement visit schedule screen (mobile))
55. V12 (Implement change review & comparison UI)
56. V13 (Add visit documentation tests)
57. G8 (Run CI, request review, merge PR – visit documentation)
58. G9 (Create feature branch – care coordination)
59. C1 (Set up Twilio account and integration)
60. C2 (Implement alert endpoints (backend))
61. C3 (Implement voice alert logic (backend))
62. C4 (Set up Expo Push Notifications)
63. C5 (Implement alert creation screen (mobile))
64. C6 (Implement floating alert button (mobile))
65. C7 (Implement alerts list screen (mobile))
66. C8 (Implement push notification handling (mobile))
67. G10 (Run CI, request review, merge PR – care coordination)
68. G11 (Create feature branch – family portal)
69. F1 (Implement family member management (backend))
70. F2 (Implement daily SMS message generation)
71. F3 (Implement daily SMS cron job)
72. F4 (Implement SMS reply processing)
73. F5 (Implement family member management UI (mobile - coordinator only))
74. F6 (Add family portal documentation)
75. G12 (Run CI, request review, merge PR – family portal)
76. G13 (Create feature branch – data bridge enablement)
77. DB1 (Scaffold data bridge service)
78. DB2 (Implement CSV import pipeline)
79. DB3 (Build import review UI)
80. DB4 (Implement daily export job)
81. DB5 (Implement manual export endpoint)
82. DB6 (Add monitoring & documentation)
83. G14 (Run CI, request review, merge PR – data bridge)
84. G15 (Create feature branch – security hardening)
85. S1 (Implement field-level encryption)
86. S2 (Implement comprehensive audit logging)
87. S3 (Enhance security headers)
88. S4 (Implement rate limiting per user)
89. S5 (Implement SQL injection prevention)
90. S6 (Implement XSS prevention)
91. S7 (Implement CSRF protection)
92. S8 (Conduct security audit)
93. G16 (Run CI, request review, merge PR – security hardening)
94. T1 (Write backend integration tests)
95. T2 (Write mobile E2E tests)
96. T3 (Conduct offline testing)
97. T4 (Conduct performance testing)
98. T5 (Conduct accessibility testing)
99. T6 (Conduct security penetration testing)
100. T7 (Conduct user acceptance testing (UAT))
101. T8 (Fix critical bugs from testing)
102. P1 (Set up production AWS infrastructure)
103. P2 (Configure production secrets)
104. P3 (Set up production monitoring)
105. P4 (Set up production logging)
106. P5 (Implement database backup and recovery)
107. P6 (Set up CI/CD pipeline for production)
108. P7 (Build and deploy backend to production)
109. P8 (Build and submit mobile app to app stores)
110. P9 (Create production runbook)
111. P10 (Conduct production smoke testing)
112. L1 (Create user documentation)
113. L2 (Create training materials)
114. L3 (Conduct team training)
115. L4 (Conduct pilot with 5 caregivers)
116. L5 (Fix pilot feedback issues)
117. L6 (Create marketing materials)
118. L7 (Set up customer support)
119. L8 (Plan phased rollout)
120. R1 (Launch Week 1 (10 users))
121. R2 (Launch Week 2 (25 users))
122. R3 (Launch Week 3 (50 users))
123. R4 (Launch Week 4 (100 users))
124. R5 (Open launch (all users))
125. R6 (Post-launch monitoring (30 days))

---

## Timeline Feasibility

**Team Composition:**

- 2 Backend Developers
- 2 Frontend Developers (React Native)
- 1 DevOps Engineer
- 1 QA Engineer (part-time)
- 1 Product Manager (part-time)

**Timeline Estimate:** ~6.5 months (28 weeks)

**Phase Breakdown:**

- Phase E (Environment): 1.5 weeks
- Phase B (Backend Core): 2 weeks
- Phase M (Mobile Core): 2.5 weeks
- Phase D (Offline Sync): 2.5 weeks
- Phase V (Visit Documentation): 3 weeks
- Phase C (Care Coordination): 2 weeks
- Phase F (Family Portal): 2 weeks
- Phase DB (Data Bridge): 2 weeks
- Phase S (Security): 2 weeks
- Phase T (Testing): 3 weeks
- Phase P (Production): 2 weeks
- Phase L (Launch Prep): 4 weeks
- Phase R (Launch): 4 weeks (phased rollout)

**Critical Path:** E → B → M → D → V → C → F → DB → S → T → P → L → R (22 weeks of sequential work)

**Parallelization Opportunities:**

- Backend and Mobile work can proceed in parallel after Phase E
- Care Coordination, Family Portal, and Data Bridge UI can overlap once backend foundation is stable
- Testing can begin while security hardening is in progress

**Risk Mitigation:**

- 20% buffer built into estimates
- Weekly sprint reviews to catch issues early
- Feature flags for risky features (voice alerts, SMS)
- Phased rollout limits blast radius
- Comprehensive testing before production

**Success Criteria:**

- All acceptance criteria met for each task
- Test coverage ≥80% for backend and mobile
- WCAG 2.1 AA compliance achieved
- Performance targets met (API <2s, app launch <2s)
- Security audit passes with no critical vulnerabilities
- User satisfaction: SUS >80, NPS >50

---

## Notes and Assumptions

**Key Assumptions:**

1. GitHub organization and AWS account exist with appropriate access
2. Team members have required skills and tools (IDEs, devices, accounts)
3. Twilio account budget: $100/month
4. AWS staging budget: $200/month
5. AWS production budget: $1,000/month
6. External security pentest budget: $5,000
7. Apple Developer account: $99/year
8. Google Play Developer account: $25 one-time
9. All third-party services (Twilio, AWS, Expo) have acceptable SLAs
10. Canadian data residency requirements met by AWS ca-central-1 region

**Out of Scope (Future Sprints):**

- Advanced reporting and analytics
- Integration with external EHR systems
- Multi-language support (i18n)
- Advanced care plan templates
- Medication reminders
- Billing and invoicing
- Advanced scheduling (recurring visits, route optimization)
- Video calls for family portal
- Advanced conflict resolution (manual review UI)
- Offline map caching for GPS

**Philosophy Adherence:**

- Every task maps to architecture requirements (zero omissions)
- Git hygiene enforced (branch → PR → review → merge → delete)
- Testing gates at every level (unit, integration, E2E, security)
- Performance targets explicit in acceptance criteria
- Accessibility requirements built in, not bolted on
- Security hardening as dedicated phase, not afterthought
- Phased rollout to limit risk and gather feedback

---

**Document Version:** 1.0.0  
**Last Updated:** November 6, 2025  
**Next Review:** After Phase E completion
