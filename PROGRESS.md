# Progress

Updated: 2026-10-31

## Current milestone

**M1 — Auth and workspaces** (next)

## M0 evidence

- `pnpm install --frozen-lockfile` succeeds; lockfile committed.
- `docker compose up -d` starts PostgreSQL 17, RustFS (S3-compatible), and Mailpit; all services healthy.
- `pnpm db:migrate` applies the initial 12-table migration.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check`, `pnpm build`, `pnpm audit --prod --audit-level=high` pass locally.
- `pnpm e2e` passes Chromium tests against the real dev stack: health/landing smoke and responsive screenshot capture with overflow assertions.
- Health endpoints return `200` with `status: ok` and `db: ok` at `/api/health` and `:1234/health`.
- Documentation screenshots captured in `docs/screenshots/`.

## Done

- Monorepo: `apps/web`, `apps/server`, `packages/shared`, `packages/db`, `packages/core`.
- Strict TypeScript 5.9, ESLint 10, Prettier, zod environment validation.
- PostgreSQL schema and first Drizzle migration: users, sessions, workspaces, members, invites, notebooks, sections, pages, favorites, Yjs documents/updates/versions.
- Next.js landing page with live database health, dark-mode palette, responsive layout.
- Fastify realtime service scaffold with `/health` and structured logging.
- Docker Compose, dev bootstrap, CI workflow, README, architecture plan, ADRs.

## Known gaps

- M0 UI is a foundations landing page, not the product workspace. Auth and navigation arrive in M1/M2.
- Local object storage uses RustFS because MinIO images are no longer publicly pullable; production remains S3-compatible.
- `eslint-plugin-jsx-a11y@6.10.2` declares peer support through ESLint 9, but works with ESLint 10. Tracked in `DECISIONS.md`.
- Docker images other than Postgres are not digest-pinned yet; hardening is M10.
- OAuth intentionally deferred; email/password + invites only in v1.

## Milestone status

| Milestone                | Status      |
| ------------------------ | ----------- |
| M0 Foundations           | Complete    |
| M1 Auth and workspaces   | Not started |
| M2 Hierarchy             | Not started |
| M3 Flow editor           | Not started |
| M4 Collaboration         | Not started |
| M5 Canvas and ink        | Not started |
| M6 Databases             | Not started |
| M7 Search and navigation | Not started |
| M8 Import/export/share   | Not started |
| M9 Templates and polish  | Not started |
| M10 Hardening            | Not started |
