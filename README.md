# Meal Planner

Meal planner web app with:
- Weekly plan generation (roster + eat-out logic)
- Editable plan board
- Grocery checklist aggregation
- Historical plan views
- One-time Excel import from your existing workbook

## Tech stack
- Next.js (App Router) + TypeScript
- Prisma + PostgreSQL (Supabase-compatible)
- Python ingestion utility managed by `uv`

## Project layout
- `app/` Next.js UI and API routes
- `prisma/` DB schema
- `tools/ingestion/` Python Excel parser and normalizer

## 1) Prerequisites
- Node.js 20+
- npm
- `uv` installed (`~/.local/bin/uv`)
- PostgreSQL/Supabase database

## 2) Environment
Copy and edit env vars:

```bash
cp .env.example .env
```

Required values:
- `DATABASE_URL` PostgreSQL connection string
- `UV_BIN` optional path to uv binary (defaults to `$HOME/.local/bin/uv`)

## 3) Install dependencies

```bash
npm install
npm run ingest:sync
```

## 4) Initialize Prisma

```bash
npm run db:generate
npm run db:migrate
```

## 5) Run app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Import existing workbook
Use the UI button on the home page, or call:

```bash
curl -X POST http://localhost:3000/api/import/excel \
  -H "Content-Type: application/json" \
  -d '{"workbookPath":"/Users/elim/Downloads/Meal Plan.xlsx","dryRun":false,"createdByPerson":"ELIM"}'
```

Dry-run parser only:

```bash
npm run ingest:dryrun
```

## API endpoints
- `POST /api/import/excel`
- `POST /api/plans/generate`
- `PATCH /api/plans/:id`
- `GET /api/plans/:id/groceries`
- `GET /api/plans/history`
- `GET /api/plans/:id`
- `GET /api/recipes`
- `POST /api/recipes`

## Current defaults
- Two users: Elim + Thomas (auto-created)
- Two eat-out days user-selected before generation
- Home-cooked dinners default to 4 portions
- Grocery output is a de-duplicated checklist
