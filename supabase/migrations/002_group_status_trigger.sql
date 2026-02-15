-- Step 4: Group status transition trigger
-- Allowed:
--   open -> locked
--   locked -> open
--   locked -> submitted
--   open -> submitted
-- Disallowed:
--   any transition from submitted

create or replace function public.enforce_group_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    new.updated_at = now();
    return new;
  end if;

  if old.status = 'submitted' then
    raise exception 'Invalid group status transition: % -> %', old.status, new.status;
  end if;

  if old.status = 'open' and new.status in ('locked', 'submitted') then
    if new.status = 'submitted' and new.submitted_at is null then
      new.submitted_at = now();
    end if;
    new.updated_at = now();
    return new;
  end if;

  if old.status = 'locked' and new.status in ('open', 'submitted') then
    if new.status = 'open' then
      new.submitted_at = null;
    end if;

    if new.status = 'submitted' and new.submitted_at is null then
      new.submitted_at = now();
    end if;

    new.updated_at = now();
    return new;
  end if;

  raise exception 'Invalid group status transition: % -> %', old.status, new.status;
end;
$$;

drop trigger if exists groups_status_transition_trigger on public.groups;

create trigger groups_status_transition_trigger
before update of status on public.groups
for each row
execute function public.enforce_group_status_transition();
