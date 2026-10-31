# Agent guide

Inkwell is a pnpm/TypeScript monorepo. Read `PLAN.md`, `PROGRESS.md`, and `DECISIONS.md` before changing code.

## Commands

```bash
pnpm bootstrap       # create .env from .env.example when missing
pnpm dev             # migrate, then run web (:3000) and realtime (:1234)
pnpm db:migrate      # apply Drizzle migrations
pnpm db:generate     # generate a migration after schema changes
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
pnpm build
```

Infrastructure: `docker compose up -d` starts Postgres, RustFS (S3-compatible), and Mailpit.

## Rules

- Domain queries and authorization live in `packages/core`; route handlers stay thin.
- Never import server-only packages into client components.
- All workspace data access goes through the central authorization layer.
- Use zod at every trust boundary.
- Do not commit `.env` files or secrets.
- Add a short ADR to `DECISIONS.md` for non-obvious dependency or architecture choices.
- Keep `PROGRESS.md` honest; record gaps instead of claiming unverified behavior.
- Do not add code comments unless they explain non-obvious constraints.
