# BerthCare Monorepo

BerthCare delivers an offline-first, React Native care delivery experience backed by a TypeScript service stack. This repository will host the shared source for mobile, backend, and infrastructure components so the full team can iterate together while keeping tooling invisible to caregivers and coordinators.

## Initial Setup

- Install Node.js 20+, pnpm 8+, Docker, and Docker Compose.
- Clone the repository (GitHub URL will be `https://github.com/berthcare/berthcare` once provisioned).
- Install dependencies with `pnpm install` after the workspace structure lands in Phase E3.
- Use `make setup`/`make start` once the DevOps tooling in later tasks is merged.

## Tooling Principles

- Two-space indentation, UTF-8 encoding, LF line endings across the codebase.
- Follow Conventional Commits for all commits and pull requests.
- Keep developer tooling fast and silent; every command should earn its place.

## Documentation References

- Architecture blueprint (v2.0.0) — see `project-documentation/architecture-output.md`, Infrastructure section, for the authoritative infrastructure and tooling direction cited in this scaffold.

## Next Steps

- Enable the required branch protections on `main` (1 review minimum, required status checks, signed commits).
- Add the CI workflow, pnpm workspace structure, and local environment tooling as tracked in Phase E tasks E2–E4.

This repository is licensed under MIT; see `LICENSE` for details.
