# Decisions

Short architecture decision records. Newest first.

## ADR-017 — NODE_ENV stays out of `.env`

**Decision:** `.env` and `.env.example` do not define `NODE_ENV`. Next.js sets it for development and production, and the server environment schema defaults to development when it is absent.

**Why:** An inherited `NODE_ENV=development` makes `next build` warn and fail while prerendering `/_global-error`, and it would force development behavior into a production start. Keeping the variable out of shared env files lets each tool choose its own mode and lets deployments set `NODE_ENV=production` explicitly.

**Alternatives:** Hard-coding `NODE_ENV=production` in the build script (breaks dev tooling); requiring every developer to unset it manually (fragile and undocumented).

## ADR-016 — Bundle workspace packages but externalize their runtime dependencies

**Decision:** The realtime server bundles `@inkwell/*` packages with tsup, while externalizing `@node-rs/argon2`, `pg`, `nodemailer`, `dotenv`, `drizzle-orm`, and `zod`. Those packages are declared as direct server dependencies.

**Why:** Workspace exports point at TypeScript source, so bundling avoids a separate build step for every package. Bundling the native Argon2 loader fails because esbuild tries to resolve every platform binary, and bundling CommonJS packages such as `pg` and `dotenv` into ESM produces unsupported dynamic `require` calls. Declaring the external packages on the server makes Node resolve them from its own `node_modules` in production. The built entrypoint was started with `node dist/index.js` and `/health` returned `200` with `db: "ok"`.

**Alternatives:** Publish built artifacts for every workspace package (more build orchestration); emit CommonJS from tsup (avoids some dynamic requires but not native binaries and moves away from the rest of the stack); bundle platform-specific binaries (fragile across developer and deployment platforms).

## ADR-015 — Argon2id baseline and numeric algorithm cast

**Decision:** Hash passwords with Argon2id at 19,456 KiB memory, 2 iterations, and parallelism 1, passing `algorithm: 2 as Algorithm`.

**Why:** These are the OWASP baseline parameters and the defaults for `@node-rs/argon2`. The package exposes `Algorithm` as an ambient `const enum`, which cannot be emitted at runtime under this TypeScript configuration, so the documented numeric value (`Argon2id = 2`) is cast to the type.

**Alternatives:** A string algorithm name (not accepted by the library); default options without an explicit algorithm (relies on an implicit default); a pure-JS Argon2 implementation (slower and less audited).

## ADR-014 — Double-submit CSRF token plus strict Origin validation

**Decision:** A non-httpOnly `inkwell_csrf` cookie is issued by the Next.js proxy. Every mutating API request must send a matching `x-csrf-token` header and an `Origin` equal to `APP_URL`.

**Why:** The header cannot be set by a cross-origin form or a simple image request. Comparing the token and origin gives two independent checks without server-side token storage. The cookie stays readable so the browser client can echo it.

**Alternatives:** Synchronizer tokens stored server-side (more state and cleanup); relying on SameSite alone (not sufficient for every browser and request type); checking only Origin (misses same-site subdomain or proxy mistakes).

## ADR-013 — Opaque, hashed, single-use tokens for sessions, resets, and invites

**Decision:** Sessions, password resets, and workspace invites use random opaque tokens. Only SHA-256 hashes are stored. Reset tokens expire after 60 minutes, invites after 7 days, and both are single-use. Sessions last 30 days and are revoked on sign-out and password reset. Invite acceptance requires the signed-in email to match the invite.

**Why:** A database leak cannot be replayed against the application, tokens can be revoked immediately, and storing hashes avoids the need for a JWT secret rotation strategy.

**Alternatives:** Signed JWTs (revocation requires a denylist or short expiry); plaintext tokens in the database (leak becomes account takeover); long-lived reset links (larger window to exploit).

## ADR-012 — In-memory rate limiting for the single-node v1

**Decision:** Authentication, reset, workspace creation, and invite endpoints use fixed-window counters held in process memory, keyed by IP, email, or user.

**Why:** The v1 deployment runs one web instance, and this avoids adding Redis or a database dependency for abuse protection. The counters are tested and easy to replace at the rate-limit boundary.

**Revisit:** Before running multiple web instances or serverless replicas. Move counters to a shared store such as Redis or Postgres.

**Alternatives:** Postgres-backed counters (write contention on every auth request); Redis now (extra infrastructure for a single-instance milestone).

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
