# MASTER PROMPT: "Inkwell", a OneNote × Notion web app

> **How to use:** Save this file in an empty repo as `MASTER_PROMPT.md` (and optionally copy it to `CLAUDE.md` / `AGENTS.md`), then tell your agent: _"Read MASTER_PROMPT.md fully and execute it. Start with PLAN.md, then begin Milestone 0 without waiting for approval."_ Edit the CONFIG block first.

---

## 0. CONFIG (edit me)

```
APP_NAME:        Inkwell            # working name, change freely
SCOPE:           v1 = web app, multi-user, one deployable instance
DEPLOY_TARGET:   Docker Compose locally; deployable to any VPS / Fly.io / Render
STACK:           defaults in §4 (override here if you have a preference)
AUTONOMY:        high; ask me only when genuinely blocked
```

---

## 1. Role and operating rules

You are a senior full-stack engineer and tech lead working autonomously in this repository. Build **{APP_NAME}** end to end: a working, tested, documented, runnable product, not a demo.

**Rules of engagement**

1. **Plan first.** Before writing code, create `PLAN.md` (repo layout, stack confirmation, milestone order, risks). Then start building immediately.
2. **Milestones are gates.** Work through §7 in order. Do not start milestone N+1 until N's acceptance criteria pass.
3. **Loop per milestone:** implement → write tests → run typecheck, lint and tests → run the app and exercise the feature in a real browser (Playwright) → fix → commit (Conventional Commits).
4. **Keep living docs:** `PROGRESS.md` (done / in progress / known gaps), `DECISIONS.md` (short ADRs: what, why, alternatives), `README.md` (setup, run, test, architecture).
5. **No fakes.** No hard-coded data in the UI, no stubs presented as finished, no silently skipped tests. If something can't be completed, record it under "Known gaps" in `PROGRESS.md`.
6. **Prefer boring, well-maintained libraries.** Justify every non-obvious dependency in `DECISIONS.md`.
7. **Decide, don't stall.** If a detail is unspecified, choose the sensible default, log it in `DECISIONS.md`, and continue.
8. **Stay safe.** No destructive commands outside the repo, no secrets in git (`.env.example` only), no telemetry or third-party calls without a config flag.
9. If context gets long, summarise state into `PROGRESS.md` so work can resume cleanly from the repo alone.

---

## 2. Product vision

**One line:** a note-taking workspace where you can think freely on a page (OneNote) _and_ organise knowledge as structured, linked data (Notion).

| From OneNote                                               | From Notion                                  |
| ---------------------------------------------------------- | -------------------------------------------- |
| Notebook → Section (colored tabs) → Page metaphor          | Nested pages, unlimited depth                |
| Free-form canvas: click anywhere and type, drag containers | Block-based editor, slash menu, drag handles |
| Ink: pen, highlighter, eraser, shapes                      | Databases with properties and multiple views |
| Drop images/PDFs anywhere on the page                      | Relations, rollups, templates, backlinks     |
| Tags and "find all my to-dos" across notebooks             | Real-time collaboration, comments, sharing   |

**The unifying design idea (implement this exactly):**
Everything on a page lives in a **Container**, and a container holds a **block tree**.

- A **Canvas page** is an infinite pan/zoom surface holding many free-positioned containers (plus ink and media).
- A **Flow page** is a canvas page with exactly one full-width, pinned container (a normal Notion-style document).
- Switching a page between Flow and Canvas must be lossless: Flow→Canvas unpins the container; Canvas→Flow stacks containers in reading order (top-to-bottom, left-to-right) into one document.
- Databases are special pages whose rows are themselves pages (so every row can be a canvas or a flow page).

**Target users:** students, researchers, and small teams who want both messy thinking space and organised structure.

---

## 3. Scope

**In v1:** everything in §7.
**Out of v1 (do not build, but don't block):** native mobile apps, end-to-end encryption, AI features, enterprise SSO/SCIM, public API/webhooks, billing. Design the data model so these can be added later.

---

## 4. Tech stack (defaults; override in CONFIG)

- **Language/tooling:** TypeScript (strict), pnpm workspaces monorepo: `apps/web`, `apps/server`, `packages/shared` (types, zod schemas, block schema).
- **Web:** React + Vite (or Next.js App Router if SSR is needed for share pages), TanStack Query, Zustand, Tailwind + Radix UI primitives.
- **Editor:** Tiptap (ProseMirror) with custom block nodes. **Collaboration:** Yjs CRDT via Hocuspocus; IndexedDB persistence (`y-indexeddb`) for offline.
- **Canvas/ink:** custom absolutely-positioned container layer with pan/zoom; ink via Pointer Events + `perfect-freehand`, stored as vector strokes inside the Yjs doc.
- **Server:** Node + Fastify (or Next route handlers), zod validation, Pino logging.
- **DB:** PostgreSQL + Drizzle ORM (migrations checked in). Search: Postgres full-text (tsvector + GIN) first.
- **Files:** S3-compatible storage (MinIO in Docker for local dev).
- **Auth:** email + password (argon2id), secure cookie sessions, optional Google/GitHub OAuth.
- **Quality:** Vitest, Playwright, ESLint, Prettier, GitHub Actions CI, Docker Compose for the full stack.

---

## 5. UX specification

**Layout (desktop):**

1. **Notebook rail** (far left): notebook icons, switcher, "+" to create.
2. **Section tabs** (top strip): colored tabs for the current notebook's sections, reorderable, OneNote-style.
3. **Page tree** (left panel): nested pages for the selected section, collapsible, drag-and-drop to reorder/nest/move across sections.
4. **Main pane:** the page (Flow or Canvas), with a slim toolbar (mode toggle, ink tools, share, history, comments).
5. **Right drawer (toggle):** backlinks, outline, comments, page history.

**Interaction requirements**

- Slash menu (`/`), markdown shortcuts, block drag handles, multi-block select, `@` mentions, `[[` page links.
- Command palette (`Ctrl/Cmd+K`) for search, navigation and actions; full keyboard shortcut sheet (`?`).
- Autosave with visible sync state (saved / syncing / offline).
- Light/dark themes, responsive down to tablet width, usable on touch/stylus.
- Empty states, loading skeletons, and friendly errors everywhere. No dead buttons.

---

## 6. Data model (starting point; refine in `DECISIONS.md`)

- `users`, `sessions`, `workspaces`, `workspace_members(role: owner|editor|viewer)`, `invites`
- `notebooks(workspace_id)`, `sections(notebook_id, color, position)`
- `pages(id, workspace_id, section_id?, parent_page_id?, type: flow|canvas|database, title, icon, cover, position, trashed_at, created_by, …)`
- `page_docs(page_id, yjs_state bytea, updated_at)` + `page_updates` (incremental) + `page_versions` (periodic snapshots)
- `page_index(page_id, plain_text, tsv)`, derived from the Yjs doc by a background worker, used for search
- `databases(page_id)`, `db_properties(type, config)`, `db_views(type, filter, sort, group, visible_props)`; **rows are `pages`** with `db_values(page_id, property_id, value jsonb)`
- `page_links(from_page, to_page)` for backlinks; `tags`, `page_tags`; `todo_index` for cross-page to-do aggregation
- `attachments(workspace_id, storage_key, mime, size, page_id)`, `comments(page_id, anchor, thread_id, …)`, `share_links(page_id, token, mode)`

**Every query that touches workspace data must enforce workspace membership and role in one central authorization layer, not ad hoc per route.**

---

## 7. Milestones and acceptance criteria

**M0, Foundations.** Monorepo, strict TS, lint/format, env validation (zod), Docker Compose (Postgres, MinIO), migrations, health endpoint, CI, README skeleton.
_Accept:_ clean clone → `pnpm i && docker compose up -d && pnpm dev` runs; CI green.

**M1, Auth and workspaces.** Sign up/in/out, password reset (dev mailer), workspaces, invites, roles.
_Accept:_ two users in one workspace; role checks enforced and covered by tests (viewer cannot write).

**M2, Hierarchy.** Notebooks, sections (colored tabs), pages, nested subpages, drag-and-drop reorder/move, rename, icon/cover, favorites, trash with restore.
_Accept:_ e2e test creates, nests, moves, trashes and restores pages; state survives reload.

**M3, Flow editor.** Blocks: paragraph, H1–H3, bullet/numbered/to-do, toggle, quote, callout, code (highlighting), divider, simple table, image, file, link preview, math (KaTeX). Slash menu, markdown shortcuts, drag handles, `[[page links]]`, `@mentions`, undo/redo, autosave.
_Accept:_ e2e covers each block type; paste from web/Word sanitises HTML (XSS test).

**M4, Real-time collab and offline.** Yjs sync, presence cursors and avatars, IndexedDB offline cache, reconnect merge, version history with restore.
_Accept:_ Playwright test with two clients typing concurrently converges; offline edits sync after reconnect; restore-version works.

**M5, Canvas and ink.** Infinite pan/zoom canvas, draggable/resizable containers each hosting the block editor, drop images/PDFs anywhere, pen/highlighter/eraser with pressure, basic shapes, lossless Flow⇄Canvas conversion.
_Accept:_ round-trip conversion test preserves all content; ink persists, syncs live between clients, and undoes correctly.

**M6, Databases.** Properties: text, number, select, multi-select, date, checkbox, URL, person, relation, rollup (count/sum/min/max), limited formula. Views: table, board, calendar, gallery, list. Filter/sort/group, saved views, inline database blocks, rows open as pages.
_Accept:_ e2e builds a project tracker with a relation and rollup; board drag changes the status property.

**M7, Search, tags, navigation.** Command-palette search (titles, content, properties), tags, recents, backlinks panel, outline panel, OneNote-style **"Tag summary"** (all to-dos/tags across a notebook with jump-to-source).
_Accept:_ search returns results in <300 ms on a seeded 5k-page workspace; backlinks update on link add/remove.

**M8, Import/export/sharing.** Export page/notebook to Markdown, HTML, PDF; import Markdown and Notion export ZIP (md + csv); read-only public share links with revoke.
_Accept:_ round-trip tests on fixture files; revoked links return 404.

**M9, Templates, comments, polish.** Page and database templates, inline comments with threads and mentions, notification inbox, dark mode, shortcut sheet, tablet responsiveness, installable PWA.
_Accept:_ e2e for comment threads; Lighthouse PWA and accessibility checks pass.

**M10, Hardening and release.** Security review against §8, performance pass, accessibility audit, backup/restore docs, demo seed workspace (`pnpm seed`), production Docker image, final report.
_Accept:_ all of §9 satisfied.

---

## 8. Non-functional requirements

- **Security:** central authz layer; zod validation on every input; argon2id; CSRF protection; strict CSP; rate-limit auth and uploads; MIME/size validation and randomised storage keys for uploads; sanitise all pasted/imported HTML; no secrets in logs; dependency audit in CI.
- **Performance:** open a 2,000-block page in <1 s; typing latency <50 ms; initial route JS <300 KB gzipped (code-split editor, canvas, database views); virtualise long lists and table views.
- **Accessibility:** WCAG 2.2 AA, full keyboard operation, correct ARIA on editor/menus/dialogs, respects reduced-motion, visible focus.
- **Reliability:** idempotent migrations, graceful reconnects, error boundaries, structured logs, nightly-backup instructions.
- **Code quality:** no `any` without a comment; shared types between client and server; small, named modules; meaningful commit history.

---

## 9. Definition of done (whole project)

1. Fresh clone runs with the documented commands; `pnpm seed` produces a realistic demo workspace.
2. `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e` all pass in CI.
3. Server authorization has ≥90% test coverage; the two-client collaboration test is stable (run 10× without flake).
4. README includes architecture diagram (Mermaid), setup, env vars, scripts, deployment, backup/restore, and screenshots.
5. `PROGRESS.md` lists every milestone's status and honest known gaps.

**Final report** (print at the end, also save as `FINAL_REPORT.md`): what was built, how to run it, what was tested and how, known gaps, security notes, and suggested next steps. Do not claim anything works that you did not run.

---

## 10. First actions (do these now)

1. Read this file completely.
2. Create `PLAN.md` (stack confirmation, repo layout, risks, milestone checklist).
3. Scaffold M0 and proceed through the milestones in order, committing as you go.
