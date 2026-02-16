# Hawks Group Order

A real-time collaborative group ordering app built with Next.js 15, Supabase, and Tailwind CSS v4.

## 🎯 Challenge Overview

This project demonstrates:
- **Real-time collaboration** across multiple browser tabs using Supabase Realtime
- **Server Components** with Next.js App Router for optimal performance
- **Row Level Security (RLS)** for authorization at the database level
- **Optimistic UI updates** for instant feedback
- **Type-safe server actions** with comprehensive validation
- **Role-based permissions** (Host vs Guest access control)

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ 
- A free Supabase account ([sign up here](https://supabase.com))

### 1. Clone the repository
```bash
git clone https://github.com/juliancthomas/group-order-app
cd group-order-project
npm install
```

### 2. Set up Supabase

#### Create a new Supabase project
1. Go to [database.new](https://database.new)
2. Create a new project (free tier is fine)
3. Wait ~2 minutes for provisioning

#### Run database migrations

**Option A: Single script (easiest)**
1. In your Supabase project, go to **SQL Editor**
2. Copy and paste the entire `supabase/setup-complete.sql` file
3. Click **Run** - this sets up everything in one go!

**Option B: Individual migrations**
1. In your Supabase project, go to **SQL Editor**
2. Copy and paste each file from `supabase/migrations/` in order:
   - `001_schema.sql` - Creates tables
   - `002_group_status_trigger.sql` - Status transition logic
   - `003_participant_cap_trigger.sql` - 3-participant limit
   - `004_rls_policies.sql` - Row Level Security
   - `005_policy_helpers.sql` - RLS helper functions
   - `006_enable_realtime.sql` - Enable real-time broadcasting
3. Run `supabase/seed.sql` to populate menu items

### 3. Configure environment variables

Create a `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

**To get these values:**
- Go to your Supabase project → **Settings** → **API**
- Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Scroll to **JWT Settings** → Copy **JWT Secret** → `SUPABASE_JWT_SECRET`

### 4. Run the app
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🧪 Testing Real-time Collaboration

1. Open the app in your browser (this creates a **Host** session)
2. Click **"Invite Friend"** button
3. Copy the invite link
4. Open the link in an **incognito/private window** (Guest #1)
5. Optionally open a third tab with the same link (Guest #2)
6. Try these scenarios:
   - **Guest adds item** → Host sees it instantly
   - **Host removes guest item** → Guest sees removal
   - **Host locks cart** → All tabs show locked state
   - **Host submits order** → All tabs show order tracker

## 📁 Project Structure

```
app/
├── group/[groupId]/page.tsx    # Main group session page
├── full/page.tsx               # "Locker room full" fallback
└── page.tsx                    # Landing page (auto-creates group)

components/
├── cart/
│   ├── CartIsland.tsx          # Real-time cart with subscriptions
│   └── ParticipantOrderSection.tsx
├── menu/
│   ├── MenuList.server.tsx     # Server-rendered menu
│   └── MenuItemCard.tsx        
└── session/
    ├── IdentityRevalidator.tsx # localStorage persistence
    └── InviteFriendDialog.tsx  

server/
├── actions/
│   ├── cart.ts                 # Cart mutations
│   ├── checkout.ts             # Lock/unlock/submit
│   ├── groups.ts               # Group CRUD
│   └── auth.ts                 # JWT token generation
└── validators/                 # Input validation layer

supabase/
└── migrations/                 # Database schema and policies
```

## 🎨 Key Features

### Real-time Synchronization
- Uses Supabase Realtime with `postgres_changes` subscriptions
- JWT-based authentication for RLS-compliant broadcasting
- Automatic fallback to 5-second polling if connection drops

### Performance Optimizations
- Menu items fetched in Server Components (zero JS for list)
- `CartIsland` is an isolated client component
- `next/image` with priority loading for top 3 items
- Optimistic UI updates with `useOptimistic`

### Security
- Row Level Security (RLS) enforces host/guest permissions at DB level
- Server-side JWT signing with participant claims
- Input validation on all server actions
- No client-side auth bypasses

### Business Rules (enforced in DB)
- Max 3 participants per group
- Status transitions: `open ↔ locked → submitted` (one-way to submitted)
- Participant cap trigger with row-level locking

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run e2e tests (requires dev server running)
npm run test:e2e
```

Test coverage:
- ✅ Status transition logic
- ✅ Cart mutation permissions
- ✅ Participant cap enforcement
- ✅ Multi-tab lock/unlock propagation
- ✅ Order tracker progression

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (Postgres + Realtime + RLS)
- **Styling**: Tailwind CSS v4 with semantic design tokens
- **UI Components**: shadcn/ui
- **Type Safety**: TypeScript (strict mode)
- **Testing**: Vitest + Playwright

## 📝 Design Decisions

### Why Supabase?
- Built-in Realtime for multi-tab sync
- RLS policies keep authorization logic in the database
- Scales from prototype to production without rewrite

### Why Server Components?
- Menu list is pure HTML/CSS (no JS bundle)
- Faster initial page load (no client-side fetching)
- SEO-friendly

### Why JWT tokens for Realtime?
- RLS policies require participant claims to authorize broadcasts
- Without JWT, guests wouldn't receive DELETE events from host
- Server action generates signed tokens with participant context

### Semantic Design Tokens
- Two-tier system: base colors → semantic tokens
- Components use `brand-primary` not `text-red-600`
- Makes theme changes easy (one place to update)

## 🚢 Production Deployment

```bash
# Build Docker image
docker build -t hawks-group-order .

# Run with Docker Compose
docker-compose up
```

## 🐛 Troubleshooting

**"Menu items not loading"**
- Run `supabase/seed.sql` in SQL Editor
- Check console for database errors

**"Real-time not working"**
- Verify `006_enable_realtime.sql` was run
- Check that `SUPABASE_JWT_SECRET` is set correctly
- Open browser console and look for "SUBSCRIBED" status

**"Can't add items to cart"**
- Verify group status is "open" (not locked/submitted)
- Check that participant exists in database

**"Third guest can't join"**
- Working as intended - max 3 participants enforced by DB trigger