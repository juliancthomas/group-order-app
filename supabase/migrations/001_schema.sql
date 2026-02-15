-- Step 4: Core schema, constraints, and indexes
-- Safe to run repeatedly in a development workflow.

create extension if not exists pgcrypto;

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  price numeric(10,2) not null check (price >= 0),
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_items_name
  on public.menu_items (name);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  host_email text not null,
  status text not null default 'open' check (status in ('open', 'locked', 'submitted')),
  submitted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_groups_status
  on public.groups (status);

create index if not exists idx_groups_created_at
  on public.groups (created_at desc);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  email text not null,
  is_host boolean not null default false,
  created_at timestamptz not null default now(),
  constraint uq_participants_group_email unique (group_id, email)
);

create index if not exists idx_participants_group_id
  on public.participants (group_id);

create unique index if not exists uq_participants_one_host_per_group
  on public.participants (group_id)
  where is_host = true;

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id),
  quantity integer not null check (quantity > 0 and quantity <= 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_cart_items_participant_menu unique (participant_id, menu_item_id)
);

create index if not exists idx_cart_items_group_id
  on public.cart_items (group_id);

create index if not exists idx_cart_items_participant_id
  on public.cart_items (participant_id);
