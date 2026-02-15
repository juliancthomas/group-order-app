-- Step 6: Enable and enforce RLS for groups, participants, and cart_items

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
