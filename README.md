# BerthCare Monorepo

BerthCare delivers an offline-first caregiver experience that keeps the technology invisible so clinicians can focus on patients. This repository will evolve into the single codebase powering the React Native mobile app, Node.js backend services, and shared infrastructure automation that support BerthCare's care delivery platform.

## Architectural Blueprint

The system design is anchored on the BerthCare Technical Architecture Blueprint (v2.0.0). Refer to `project-documentation/architecture-output.md` for the comprehensive architecture narrative covering the offline-first data model, performance targets, infrastructure stack, and critical design decisions.

Key tenets from the blueprint:

- Offline-first React Native application with WatermelonDB for instant local operations.
- Node.js and Express services backed by PostgreSQL, Redis, and AWS S3 in the ca-central-1 region.
- Voice-first communications leveraging Twilio Voice/SMS and Expo Push Notifications.
- Security baked in across the stack: end-to-end encryption, Canadian data residency, auditability.

## Repository Structure

```
project-documentation/   Planning, architecture, and technical blueprints
design-documentation/   Product and UX assets supporting the caregiver journey
```

Shared package workspaces (mobile, server, infrastructure) will be introduced in subsequent milestones as the monorepo is scaffolded.

## Initial Setup

1. Clone the GitHub repository once created.
2. Install the required toolchain:
   - Node.js 20 LTS (apps and tooling)
   - Yarn or pnpm (workspace package management)
   - Expo CLI (React Native)
3. Follow forthcoming workspace READMEs for domain-specific setup steps.

## Governance

- Changes to `main` require an approved pull request, status checks, and signed commits.
- CODEOWNERS enforce review responsibilities across the codebase.
- Branch protection and CI configuration should align with the DevOps runbook defined in the architecture blueprint.

## License

This project is provided under the MIT License (see `LICENSE`).
