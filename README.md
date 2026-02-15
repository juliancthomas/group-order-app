# Hawks Group Order

Realtime collaborative food ordering demo built with Next.js App Router and Supabase.

## Local Development

1. Copy environment variables:
   - `cp .env.example .env.local`
2. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
3. Install dependencies:
   - `npm install`
4. Run the app:
   - `npm run dev`
5. Open `http://localhost:3000`.

## Scripts

- `npm run dev` - Start Next.js dev server.
- `npm run build` - Build production output.
- `npm run start` - Run production server.
- `npm run lint` - Run Next.js lint checks.
- `npm run typecheck` - Run TypeScript checks.
- `npm run test` - Run unit/integration tests (Vitest).
- `npm run test:e2e` - Run Playwright tests.

## Docker Quickstart

### Reviewer Runbook

1. Create a local `.env` file (or export shell env vars) with:
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
2. Build and run:
   - `docker-compose up --build`
3. Open `http://localhost:3000`.

### Verification Checklist

- Container builds successfully without manual image edits.
- App boots on `http://localhost:3000`.
- Group session initializes on first page load.
- Menu renders (seed data visible) and Supabase calls succeed.
- Realtime/cart interactions continue to work in multiple tabs.

### Troubleshooting

- `Missing Supabase environment variables` in logs:
  - Ensure `.env` exists for Compose (or environment is exported) and includes both required vars.
- Build fails on dependency resolution:
  - Run `npm install` locally once and retry `docker-compose up --build`.
- Port 3000 already in use:
  - Stop local dev server or change Compose port mapping.
- Menu empty in container:
  - Re-run `supabase/seed.sql` in Supabase and refresh.
