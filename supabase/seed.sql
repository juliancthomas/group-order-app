-- Step 5: Deterministic Hawks-themed menu seed data
-- Uses fixed UUIDs so upserts remain stable across reseeds.

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
