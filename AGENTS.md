# AGENTS.md — project context for AI coding agents

Single source of truth for Claude Code, Cursor and other agents. Prefer linking to `DOCUMENTATION/` over inventing conventions.

## Overview

**D-cubby** is a free, self-hosted digital asset management (DAM) app for a single organization. It is a monorepo: `apps/api` (Rails API) + `apps/web` (Next.js). The DAM itself comes from the [`dam` gem](https://github.com/scervera/dam); this repo is the host app (organization, users, auth, setup, settings) plus the web UI. Distributed as two Docker images (`ghcr.io/scervera/d-cubby-{api,web}`) run with Docker Compose behind Caddy.

## Stack

| Layer | Choice |
|-------|--------|
| API | Ruby on Rails (API mode), Puma, `dam` gem mounted at `/api/v1` |
| DB / jobs / cache | PostgreSQL 17; Solid Queue and Solid Cache in the same database (no Redis) |
| Web | Next.js App Router, TypeScript, Tailwind CSS |
| Distribution | Docker Compose: `caddy`, `web`, `api`, `worker` (`bin/jobs`), `postgres` |

## Commands

### Dev (repo root)

| Task | Command |
|------|---------|
| Host dev (web `:4080`, API `:4081`, jobs) | `bin/dev` (`-v` streams output) |
| Stop / restart | `bin/dev-stop` (`--all` also stops Postgres) / `bin/restart` |
| Follow logs | `bin/dev-logs [rails\|jobs\|nextjs]` |
| Env template | `env.development.example` → root `.env.local` (synced into apps by `bin/dev`) |

Open http://localhost:4080 only. Next.js proxies `/api`, `/users` and `/rails/active_storage` to Rails in development (`apps/web/next.config.ts`); Caddy does the same in production.

### API (`cd apps/api`)

| Task | Command |
|------|---------|
| Migrate / seed | `bin/rails db:migrate` / `bin/rails db:seed` |
| Test | `bundle exec rspec` |
| Lint | `bundle exec rubocop` |

### Web (`cd apps/web`)

| Task | Command |
|------|---------|
| Dev / build | `npm run dev` / `npm run build` |
| Lint / typecheck | `npm run lint` / `npx tsc --noEmit` |

## Conventions

- **Single organization per install.** The tenant is always `Organization.current`; never read a tenant from the request.
- **Infrastructure settings live only in `.env`**, written by `install.sh`. The UI may show their status and run tests, but never edits them. App data (org name, logo, retention, users) lives in the database.
- **Never return secrets** from `/api/v1/config` or `/api/v1/system/status`.
- **API client uses the relative base URL `/api/v1`.** No `NEXT_PUBLIC_*` build args; one web image must work on any domain.
- **Jobs** run on Solid Queue. Recurring jobs go in `apps/api/config/recurring.yml`.
- **DAM changes belong in the `dam` gem**, not here. Pin the gem by tag.
- **Docs**: `DOCUMENTATION/**/*.md` (kebab-case); index in `DOCUMENTATION/00-OVERVIEW/index.md`.

## Do not touch

- Secrets: `.env*` (except `.env.example` and `env.*.example`), `apps/api/config/master.key`.
- Build output: `apps/web/.next`, `tmp/`, `coverage/`.
