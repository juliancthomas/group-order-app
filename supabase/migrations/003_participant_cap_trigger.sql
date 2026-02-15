-- Step 5: Participant cap trigger (max 3 participants per group)

create or replace function public.enforce_participant_cap()
returns trigger
language plpgsql
as $$
declare
  participant_count integer;
begin
  -- Lock existing participant rows for this group so concurrent inserts
  -- cannot race past the max-3 rule.
  perform 1
  from public.participants
  where group_id = new.group_id
  for update;

  select count(*)
  into participant_count
  from public.participants
  where group_id = new.group_id;

  if participant_count >= 3 then
    raise exception 'Group % already has the maximum of 3 participants', new.group_id;
  end if;

  return new;
end;
$$;

drop trigger if exists participants_max_three_trigger on public.participants;

create trigger participants_max_three_trigger
before insert on public.participants
for each row
execute function public.enforce_participant_cap();
