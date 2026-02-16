-- ============================================================================
-- Hawks Group Order - Complete Database Setup
-- ============================================================================
-- Run this entire script in your Supabase SQL Editor to set up everything.
-- This includes: schema, triggers, RLS policies, and seed data.
-- ============================================================================

-- Step 1: Create tables and constraints
-- ============================================================================

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  price numeric(10, 2) not null check (price >= 0),
  image_url text not null,
  created_at timestamptz default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'open' check (status in ('open', 'locked', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  email text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  is_host boolean not null default false,
  created_at timestamptz default now(),
  constraint unique_email_per_group unique (group_id, email)
);

create unique index if not exists idx_participants_one_host_per_group
on public.participants (group_id)
where is_host = true;

create index if not exists idx_participants_group_id on public.participants(group_id);
create index if not exists idx_participants_email on public.participants(email);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz default now(),
  constraint unique_participant_menu_item unique (participant_id, menu_item_id)
);

create index if not exists idx_cart_items_group_id on public.cart_items(group_id);
create index if not exists idx_cart_items_participant_id on public.cart_items(participant_id);


-- Step 2: Group status transition trigger
-- ============================================================================

create or replace function public.enforce_group_status_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'submitted' then
    raise exception 'Cannot transition from submitted state';
  end if;

  if old.status = 'open' and new.status not in ('open', 'locked', 'submitted') then
    raise exception 'Invalid transition from open';
  end if;

  if old.status = 'locked' and new.status not in ('locked', 'open', 'submitted') then
    raise exception 'Invalid transition from locked';
  end if;

  return new;
end;
$$;

drop trigger if exists groups_status_transition_trigger on public.groups;

create trigger groups_status_transition_trigger
before update of status on public.groups
for each row
execute function public.enforce_group_status_transition();


-- Step 3: Participant cap trigger (max 3)
-- ============================================================================

create or replace function public.enforce_participant_cap()
returns trigger
language plpgsql
as $$
declare
  participant_count int;
begin
  select count(*) into participant_count
  from public.participants
  where group_id = new.group_id
  for update;

  if participant_count >= 3 then
    raise exception 'Maximum 3 participants per group';
  end if;

  return new;
end;
$$;

drop trigger if exists participants_max_three_trigger on public.participants;

create trigger participants_max_three_trigger
before insert on public.participants
for each row
execute function public.enforce_participant_cap();


-- Step 4: RLS policy helper functions
-- ============================================================================

create or replace function public.current_claims()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb;
$$;

create or replace function public.current_participant_id()
returns uuid
language sql
stable
as $$
  select nullif(public.current_claims() ->> 'participant_id', '')::uuid;
$$;

create or replace function public.current_group_id()
returns uuid
language sql
stable
as $$
  select nullif(public.current_claims() ->> 'group_id', '')::uuid;
$$;

create or replace function public.current_email()
returns text
language sql
stable
as $$
  select nullif(public.current_claims() ->> 'email', '');
$$;

create or replace function public.current_is_host()
returns boolean
language sql
stable
as $$
  select coalesce((public.current_claims() ->> 'is_host')::boolean, false);
$$;

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participants p
    where p.id = public.current_participant_id()
      and p.group_id = target_group_id
  );
$$;

create or replace function public.can_access_cart_row(
  target_group_id uuid,
  target_participant_id uuid
)
returns boolean
language sql
stable
as $$
  select
    (
      public.current_is_host()
      and public.current_group_id() = target_group_id
    )
    or (
      public.current_group_id() = target_group_id
      and public.current_participant_id() = target_participant_id
    );
$$;

grant execute on function public.current_claims() to anon, authenticated;
grant execute on function public.current_participant_id() to anon, authenticated;
grant execute on function public.current_group_id() to anon, authenticated;
grant execute on function public.current_email() to anon, authenticated;
grant execute on function public.current_is_host() to anon, authenticated;
grant execute on function public.is_group_member(uuid) to anon, authenticated;
grant execute on function public.can_access_cart_row(uuid, uuid) to anon, authenticated;


-- Step 5: Enable RLS and create policies
-- ============================================================================

alter table public.groups enable row level security;
alter table public.participants enable row level security;
alter table public.cart_items enable row level security;

drop policy if exists groups_select_member on public.groups;
drop policy if exists groups_update_host on public.groups;

create policy groups_select_member
on public.groups
for select
using (public.is_group_member(id));

create policy groups_update_host
on public.groups
for update
using (
  public.is_group_member(id)
  and public.current_is_host()
)
with check (
  public.is_group_member(id)
  and public.current_is_host()
);

drop policy if exists participants_select_same_group on public.participants;
drop policy if exists participants_insert_self_invite on public.participants;

create policy participants_select_same_group
on public.participants
for select
using (public.is_group_member(group_id));

create policy participants_insert_self_invite
on public.participants
for insert
with check (
  public.current_group_id() = group_id
  and lower(coalesce(public.current_email(), '')) = lower(email)
);

drop policy if exists cart_items_select_role_aware on public.cart_items;
drop policy if exists cart_items_insert_role_aware on public.cart_items;
drop policy if exists cart_items_update_role_aware on public.cart_items;
drop policy if exists cart_items_delete_role_aware on public.cart_items;

create policy cart_items_select_role_aware
on public.cart_items
for select
using (public.can_access_cart_row(group_id, participant_id));

create policy cart_items_insert_role_aware
on public.cart_items
for insert
with check (public.can_access_cart_row(group_id, participant_id));

create policy cart_items_update_role_aware
on public.cart_items
for update
using (public.can_access_cart_row(group_id, participant_id))
with check (public.can_access_cart_row(group_id, participant_id));

create policy cart_items_delete_role_aware
on public.cart_items
for delete
using (public.can_access_cart_row(group_id, participant_id));


-- Step 6: Enable Realtime broadcasting
-- ============================================================================

alter publication supabase_realtime add table public.cart_items;
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.participants;


-- Step 7: Seed menu items
-- ============================================================================

insert into public.menu_items (id, name, description, price, image_url)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Trae Young Tacos',
    'Three street tacos with fire-roasted salsa, lime crema, and crunchy slaw.',
    13.50,
    'https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Hawk Wing Basket',
    'Crispy wings tossed in choice of lemon pepper or hot buffalo, served with ranch.',
    14.25,
    'https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Courtside Loaded Fries',
    'Seasoned fries topped with queso, green onions, smoked bacon, and jalapenos.',
    11.00,
    'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Fast Break Chicken Sandwich',
    'Crispy chicken breast with pickles, house mayo, and toasted brioche bun.',
    12.75,
    'https://images.unsplash.com/photo-1615297928064-24977384d0da?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Peachtree Lemonade',
    'Fresh lemonade with peach puree and mint over crushed ice.',
    5.50,
    'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'Sixth Man Brownie',
    'Warm chocolate brownie served with vanilla whip and caramel drizzle.',
    6.25,
    'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?auto=format&fit=crop&w=1200&q=80'
  )
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url;

-- ============================================================================
-- Setup complete! You're ready to run the app.
-- ============================================================================
