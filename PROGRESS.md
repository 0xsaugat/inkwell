# Progress

Updated: 2026-11-01

## Current milestone

**M2 - Hierarchy** (next)

## M1 evidence

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`, `pnpm format:check`, `pnpm build`, and `pnpm audit --prod --audit-level=high` pass locally.
- `pnpm test` passes unit coverage for password hashing, token hashing, authorization ranking, and rate limiting.
- `pnpm test:integration` passes against PostgreSQL using an isolated `inkwell_test` database.
- `pnpm e2e` passes five Chromium tests against the real dev stack. The workspace spec signs up two users, invites through Mailpit, accepts the invite, verifies the member list, and confirms a viewer receives `403 forbidden` on a write.
- The password-reset spec resets a password through a Mailpit link, confirms old sessions are revoked, rejects the old password, and signs in with the new one.
- CI has separate quality, integration, and end-to-end jobs. The end-to-end job starts PostgreSQL and Mailpit.
- Documentation screenshots: `docs/screenshots/signin.png`, `dashboard.png`, `workspace-members.png`, plus the M0 landing captures.

## Done

- Monorepo: `apps/web`, `apps/server`, `packages/shared`, `packages/db`, `packages/core`.
- Strict TypeScript 5.9, ESLint 10, Prettier, zod environment validation.
- PostgreSQL schema and Drizzle migrations for users, sessions, password-reset tokens, workspaces, members, invites, notebooks, sections, pages, favorites, Yjs documents/updates/versions.
- Email/password auth with Argon2id, opaque hashed sessions, sign-up/in/out, cookie handling, and password reset through SMTP.
- Workspaces: list, create, rename, delete, member list, owner/editor/viewer roles, invites with emailed single-use links, role changes, member removal, and leave.
- Central authorization in `packages/core`: every workspace operation resolves membership and role through `requireWorkspaceRole`; non-members receive `404`, insufficient roles receive `403`.
- CSRF defense: non-httpOnly token cookie, required `x-csrf-token` header, and strict `Origin` validation on mutations.
- Rate limits for sign-up, sign-in, password reset, workspace creation, and invites.
- Auth and workspace UI: sign-in, sign-up, forgot/reset password, invite acceptance, dashboard, and workspace member/settings views.
- Next.js landing page with live database health, dark-mode palette, responsive layout.
- Fastify realtime service scaffold with `/health` and structured logging.
- Docker Compose, dev bootstrap, CI workflow, README, architecture plan, ADRs.

## Known gaps

- Rate limiting is in-process memory, so limits are per web instance. A shared store is required before horizontal scaling.
- Email addresses are not verified at sign-up. Password reset and invite delivery depend on working SMTP.
- There is no ownership transfer yet; an owner cannot leave or be demoted, and only deleting the workspace removes them.
- Sessions can be revoked only by signing out or resetting the password; there is no session-management UI.
- The ≥90% authorization coverage release gate is not measured or enforced yet; it is planned for the hardening pass.
- Chromium is the only browser exercised by Playwright.
- The realtime service and collaboration workflows are still scaffolds.
- Local object storage uses RustFS because MinIO images are no longer publicly pullable; production remains S3-compatible.
- `eslint-plugin-jsx-a11y@6.10.2` declares peer support through ESLint 9, but works with ESLint 10. Tracked in `DECISIONS.md`.
- Docker images other than Postgres are not digest-pinned yet; hardening is M10.
- OAuth intentionally deferred; email/password + invites only in v1.

## Milestone status

| Milestone                | Status      |
| ------------------------ | ----------- |
| M0 Foundations           | Complete    |
| M1 Auth and workspaces   | Complete    |
| M2 Hierarchy             | Next        |
| M3 Flow editor           | Not started |
| M4 Collaboration         | Not started |
| M5 Canvas and ink        | Not started |
| M6 Databases             | Not started |
| M7 Search and navigation | Not started |
| M8 Import/export/share   | Not started |
| M9 Templates and polish  | Not started |
| M10 Hardening            | Not started |
