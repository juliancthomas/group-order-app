-- Step 6: Helper functions for readable RLS policies
-- These helpers read participant context from JWT claims.
-- Expected claims:
--   participant_id: uuid
--   group_id: uuid
--   email: text
--   is_host: boolean

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
