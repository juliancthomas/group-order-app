# Hawks Group Order - Feature Grouped Jira Backlog

## Feature 1: Project Foundation & Design System

### HGO-1 - Initialize Next.js App Router foundation
- **User Story:** As a developer, I want a clean Next.js App Router baseline so feature work can be built consistently.
- **Description:** Scaffold app structure, strict TypeScript, base layout, environment variable wiring, and shared utilities.
- **Acceptance Criteria:**
  - Next.js app runs locally with App Router.
  - Base folder structure exists (`app`, `components`, `lib`, `server`, `types`, `tests`).
  - Env vars for Supabase are read without runtime errors.
  - Basic health route/page renders successfully.

### HGO-2 - Configure Tailwind v4 + semantic brand tokens
- **User Story:** As a UI developer, I want semantic design tokens so brand theming is scalable across features.
- **Description:** Add tokenized brand variables and map to shadcn-compatible semantic tokens in `globals.css`.
- **Acceptance Criteria:**
  - Tokens include `--brand-primary`, `--brand-accent`, `--brand-dark`.
  - Components use semantic classes (`bg-brand-primary`, etc.) only.
  - No literal color utility classes are used in feature components.

### HGO-3 - Install and baseline shadcn/ui components
- **User Story:** As a developer, I want consistent UI primitives so pages are fast to build and cohesive.
- **Description:** Install shadcn/ui and prepare base primitives (button, card, dialog, badge, input, skeleton).
- **Acceptance Criteria:**
  - Core components render in app.
  - Dark/light token mapping works with semantic brand setup.
  - Components are reusable across menu/cart/session screens.

---

## Feature 2: Supabase Data Model, Security, and Seed Data

### HGO-4 - Create core schema tables and relationships
- **User Story:** As a system, I need normalized group-order tables so all workflows have a reliable data model.
- **Description:** Create `groups`, `participants`, `menu_items`, and `cart_items` with FK relationships and constraints.
- **Acceptance Criteria:**
  - All four core tables created with expected columns.
  - Foreign keys and unique constraints are enforced.
  - Migration is repeatable in clean environment.

### HGO-5 - Add participant cap and status transition triggers
- **User Story:** As product logic, I want DB-level business constraints so invalid states are prevented under concurrency.
- **Description:** Add trigger to cap participants at 3 per group and validate `groups.status` transitions.
- **Acceptance Criteria:**
  - 4th participant insert is rejected at DB layer.
  - Invalid status transitions are blocked.
  - Valid transitions (`open <-> locked`, `locked -> submitted`) succeed.

### HGO-6 - Implement RLS policy matrix for host/guest permissions
- **User Story:** As a participant, I should only access data that matches my role permissions.
- **Description:** Define RLS policies for group reads, host-only updates, and guest item ownership restrictions.
- **Acceptance Criteria:**
  - Guests cannot modify other participants' cart items.
  - Hosts can manage all group cart items.
  - Unauthorized lock/unlock/submit attempts are rejected.

### HGO-7 - Seed Hawks-themed menu items
- **User Story:** As a participant, I want realistic menu content so the demo feels complete.
- **Description:** Seed `menu_items` with 2-6 Atlanta Hawks-themed products and image URLs.
- **Acceptance Criteria:**
  - Seed script inserts menu data in clean DB.
  - Names, prices, and images display correctly in UI.
  - Seed can be re-run safely in development.

---

## Feature 3: Session Bootstrap, Invite Flow, and Participant Identity

### HGO-8 - Build host bootstrap flow on app open
- **User Story:** As a new user, opening the app should make me Host of a new group session.
- **Description:** Root entry creates group + host participant transactionally and persists host identity.
- **Acceptance Criteria:**
  - Initial app visit creates one new group and host participant.
  - Host role and email are shown in the UI.
  - Refresh preserves participant identity via localStorage.

### HGO-9 - Implement invite simulation and guest auto-join/resume
- **User Story:** As a Host, I can invite friends by email and they can join from a generated invite URL.
- **Description:** Invite dialog opens a new tab with query params and guest tab auto-creates/resumes participant.
- **Acceptance Criteria:**
  - Invite action opens URL with `group` and `invite` params.
  - Existing email in same group resumes same participant (no duplicates).
  - Guest identity persists across refresh.

### HGO-10 - Build host participant roster with re-open link
- **User Story:** As a Host, I want to see all participants and quickly re-open guest tabs.
- **Description:** Render host participant list with role, email, and "Re-open Tab" action per guest.
- **Acceptance Criteria:**
  - Participant list updates when guests join.
  - Re-open button opens correct invite URL.
  - Host/guest role labels are clearly shown.

### HGO-11 - Handle group full state and disable invites
- **User Story:** As a Host/Guest, I need clear handling when participant limit is reached.
- **Description:** Disable invite at limit and show "Locker Room is Full" branded page for overflow joins.
- **Acceptance Criteria:**
  - Invite button disabled when count reaches 3.
  - Overflow guest sees themed full-capacity screen.
  - No overflow participant rows are created.

---

## Feature 4: Server-Rendered Menu Experience

### HGO-12 - Implement menu fetch in Server Component
- **User Story:** As a participant, I want fast menu rendering with SEO-friendly markup.
- **Description:** Build server-rendered menu list using Supabase server client and semantic HTML.
- **Acceptance Criteria:**
  - Menu is fetched server-side (not client-only fetch).
  - Markup uses `article`, `h2`, and meaningful alt text.
  - Empty/error states are visible and actionable.

### HGO-13 - Add Suspense loading states for menu hydration
- **User Story:** As a user, I want graceful loading states while menu data resolves.
- **Description:** Add Suspense boundary with skeleton/fallback for menu section.
- **Acceptance Criteria:**
  - Menu section shows loading skeleton before data resolves.
  - Fallback does not block full page rendering.
  - UX remains stable on slower networks.

### HGO-14 - Optimize menu images with next/image priority
- **User Story:** As a user, I want fast first paint of menu cards.
- **Description:** Use `next/image` and prioritize top 2-3 products for LCP optimization.
- **Acceptance Criteria:**
  - Menu images use `next/image`.
  - Priority applied to first 2-3 items.
  - Lighthouse LCP improves vs non-priority baseline.

---

## Feature 5: Real-Time Shared Cart (Client Island)

### HGO-15 - Build cart island and initial snapshot loading
- **User Story:** As a participant, I need an interactive cart that reflects current group state.
- **Description:** Create `'use client'` cart island and hydrate from server action snapshot.
- **Acceptance Criteria:**
  - Cart UI is isolated in a client component island.
  - Initial data is loaded from server action.
  - Cart renders role-appropriate view.

### HGO-16 - Implement realtime cart sync via Supabase Realtime
- **User Story:** As participants, we should see updates instantly across tabs.
- **Description:** Subscribe to `postgres_changes` and reconcile updates into local cart state.
- **Acceptance Criteria:**
  - Add/update/remove actions reflect across open tabs in near real-time.
  - Reconnect behavior handles temporary disconnects.
  - No duplicate rows caused by merge logic.

### HGO-17 - Enforce guest cart visibility and ownership limits
- **User Story:** As a Guest, I can only view/manage my own cart items.
- **Description:** Restrict guest queries and mutations to own participant record.
- **Acceptance Criteria:**
  - Guests cannot view other guests' items.
  - Guests cannot modify host or other guest rows.
  - Guest subtotal is correctly calculated.

### HGO-18 - Implement host full-cart management and totals
- **User Story:** As Host, I need complete visibility and control over all participant orders.
- **Description:** Host can CRUD any participant item and see participant breakdown + group total.
- **Acceptance Criteria:**
  - Host sees grouped cart by participant.
  - Host can adjust/remove any participant item.
  - Group total updates correctly after mutations.

---

## Feature 6: Checkout Lock/Unlock and Order Submission

### HGO-19 - Build host-only checkout review entry and cart lock
- **User Story:** As Host, entering checkout should lock edits for everyone else.
- **Description:** Add host-only "Review Order" action that sets group status to `locked`.
- **Acceptance Criteria:**
  - Only host sees/enables review action.
  - Group status changes to `locked`.
  - Guests see "Cart locked" state with disabled controls.

### HGO-20 - Implement reversible lock flow
- **User Story:** As Host, I can return to editing before submission.
- **Description:** Add "Back to Editing" action to set status from `locked` to `open`.
- **Acceptance Criteria:**
  - Unlock action available only to host.
  - Guests regain edit controls after unlock.
  - Status transitions are realtime across tabs.

### HGO-21 - Implement host-only submit order transition
- **User Story:** As Host, I can finalize the order and start tracking for everyone.
- **Description:** Submit action sets `status=submitted` and `submitted_at` timestamp.
- **Acceptance Criteria:**
  - Only host can submit.
  - `submitted_at` is persisted on submit.
  - All participant tabs transition to tracker state automatically.

---

## Feature 7: Post-Submit Tracker Experience

### HGO-22 - Build Domino's-style order tracker UI
- **User Story:** As a participant, I can see clear progress after order submission.
- **Description:** Implement three-stage tracker with visual step states and animation.
- **Acceptance Criteria:**
  - Stages shown: Ordered, In Progress, Delivered.
  - Active/completed steps are visually distinct.
  - Tracker appears for all participants after submit.

### HGO-23 - Implement server-timestamp based stage calculation
- **User Story:** As a participant, tracker progress should remain accurate after refresh.
- **Description:** Calculate stage from `submitted_at` and server time, not local-only timer.
- **Acceptance Criteria:**
  - Refresh at 10+ seconds resumes correct stage.
  - Stage thresholds are 0s, 15s, and 45s.
  - Clock skew is minimized by server-time reference.

---

## Feature 8: Quality, Testing, and Deployment Readiness

### HGO-24 - Add unit tests for business logic and guards
- **User Story:** As a maintainer, I need confidence in core logic with fast tests.
- **Description:** Add Jest coverage for tracker utility, authorization guards, and selectors.
- **Acceptance Criteria:**
  - Unit tests cover stage calculation thresholds.
  - Tests confirm guest/host mutation permissions.
  - Tests run cleanly in CI/local.

### HGO-25 - Add integration tests for DB constraints and transitions
- **User Story:** As a developer, I need automated checks for schema-level business rules.
- **Description:** Validate participant cap trigger, unique participant behavior, and status transitions.
- **Acceptance Criteria:**
  - 4th participant is rejected in test.
  - Duplicate invite email resumes participant.
  - Invalid transitions fail with clear errors.

### HGO-26 - Add Playwright e2e multi-tab collaboration flow
- **User Story:** As interviewer/reviewer, I want proof of end-to-end realtime collaboration behavior.
- **Description:** Automate host + guest flows, cart sync, lock/unlock, submit, and tracker refresh behavior.
- **Acceptance Criteria:**
  - Multi-tab invite and cart sync scenario passes.
  - Lock/unlock behavior validated for guest controls.
  - Tracker refresh timeline test passes.

### HGO-27 - Dockerize app for one-command reviewer startup
- **User Story:** As a reviewer, I can run the project quickly with minimal setup.
- **Description:** Configure Dockerfile + docker-compose with Supabase env vars and startup docs.
- **Acceptance Criteria:**
  - `docker-compose up --build` launches app successfully.
  - Required env vars are documented.
  - Startup path is validated on a clean machine.
