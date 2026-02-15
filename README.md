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

The final deployment workflow targets a single command:

- `docker-compose up --build`

Docker artifacts are added in a later implementation step after app features are in place.
