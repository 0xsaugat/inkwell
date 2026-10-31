# Decisions

Short architecture decision records. Newest first.

## ADR-011 — ESLint 10 with jsx-a11y's ESLint 9 peer range

**Decision:** Use ESLint 10 with `eslint-plugin-jsx-a11y@6.10.2`.

**Why:** The repository lints cleanly with the combination and gets current ESLint behavior. The plugin's published peer range stops at ESLint 9, so installation prints a peer warning. If the plugin starts failing or a supported release appears, re-evaluate immediately.

**Alternatives:** ESLint 9 (now deprecated); dropping jsx-a11y (loses useful static accessibility checks).

## ADR-010 — RustFS replaces MinIO for local object storage

**Decision:** Development uses `rustfs/rustfs` on ports 9000/9001 with the S3 API. Production remains S3-compatible and is not tied to RustFS.

**Why:** Docker Hub denies pulls of the MinIO server and client images in this environment, and Quay has no matching manifests. RustFS exposes the same S3 API, ports, and MinIO-style root credentials, so application code and environment variables are unchanged.

**Alternatives:** SeaweedFS (multi-service or mini setup, more moving parts); LocalStack (test emulator, heavier); building a MinIO image from source (licensing and maintenance risk).

**Revisit:** if MinIO images return or a managed S3 provider becomes the target.

## ADR-001 — Next.js App Router plus a separate realtime service

**Decision:** Next.js owns UI, SSR share pages, and the HTTP API. A separate Node service owns Hocuspocus, Yjs persistence, and background workers.

**Why:** The chosen frontend is Next.js. App Router route handlers cannot host WebSocket upgrades, and background indexing/PDF work should not run in request handlers. A separate realtime process keeps WebSocket lifecycle and jobs isolated and lets both runtimes share `packages/core`.

**Alternatives:** Fastify serving the HTTP API with Next only for UI (more proxies, split cookies); Next custom server (loses standalone output and complicates deploys); third-party collaboration hosting (not self-hosted, conflicts with scope).

## ADR-002 — One Y.Doc per page with one fragment per container

**Decision:** Container layout is a `Y.Map`, ink is a `Y.Array`, and each container's content is a named `Y.XmlFragment` bound to Tiptap via the Collaboration extension's `fragment` option.

**Why:** Tiptap 3 supports raw fragment binding. One document per page gives one provider, one offline cache, and atomic Flow/Canvas conversion. Deep cloning a fragment preserves content during conversion.

**Alternatives:** One Y.Doc per container (many providers, partial offline state); layout in Postgres only (no live canvas movement); document-per-page with a single fragment and positional metadata (cannot host independent editor instances cleanly).

## ADR-003 — PostgreSQL advisory data plus async indexing

**Decision:** Yjs state lives in `page_docs`/`page_updates`/`page_versions`. Search, links, and to-do aggregates are derived asynchronously by pg-boss workers.

**Why:** Postgres is already the source of truth for metadata. Async derivation keeps collaboration writes fast and makes backfills possible.

**Alternatives:** Synchronous indexing in the WebSocket store hook (latency and failure coupling); external search engine (unnecessary for v1 scale).

## ADR-004 — Central authorization module

**Decision:** Every domain operation goes through `packages/core`, which enforces workspace membership and role. Routes never construct workspace-scoped queries themselves.

**Why:** The project requires one central authorization layer. A single service boundary is testable and prevents ad-hoc role checks.

**Alternatives:** Per-route guards (duplicated, easy to miss); database row-level security alone (harder to test and couples auth to SQL).

## ADR-005 — TypeScript 5.9.3, not 7.x

**Decision:** Pin TypeScript 5.9.3.

**Why:** `typescript-eslint` at the current release supports TypeScript below 6.1. TypeScript 7 would break typed linting.

**Revisit:** when the lint toolchain declares support.

## ADR-006 — Pin Tiptap collaboration cursor to 3.0.0

**Decision:** Use `@tiptap/extension-collaboration-cursor@3.0.0` explicitly.

**Why:** The npm `latest` dist-tag still points at the v2 line while the rest of Tiptap is v3. An explicit version avoids a mixed-major install.

## ADR-007 — Email/password only for v1

**Decision:** No OAuth in v1. Password reset and invites use development SMTP (Mailpit locally).

**Why:** No external credentials are available, and untestable callback flows would violate the no-fakes rule. The schema leaves password hashes nullable for future identity providers.

**Alternatives:** Google/GitHub OAuth now (blocked on credentials and callback setup).

## ADR-008 — Development ports and services

**Decision:** Web `:3000`, realtime `:1234`, Postgres `:5433`, S3-compatible storage `:9000/:9001`, Mailpit `:1025/:8025`.

**Why:** Avoids the common local Postgres port and keeps each service separately reachable. Ports are configurable through environment variables.

## ADR-009 — Images are pinned by tag, not digest, in development

**Decision:** Development Docker services use stable major tags (`postgres:17-alpine`) or current images (`rustfs`, `mailpit`).

**Why:** Local development needs images that exist today. Production images and critical dependencies are pinned by digest/version during M10.

**Revisit:** M10 hardening.
