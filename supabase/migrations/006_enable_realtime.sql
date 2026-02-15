-- Step 6b: Enable Realtime broadcasting for real-time collaboration
-- This allows Supabase to broadcast database changes to subscribed clients

-- Enable Realtime for cart_items table (for cart updates)
alter publication supabase_realtime add table public.cart_items;

-- Enable Realtime for groups table (for status changes)
alter publication supabase_realtime add table public.groups;

-- Optionally enable for participants table (for participant list updates)
alter publication supabase_realtime add table public.participants;
