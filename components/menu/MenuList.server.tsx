import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { getMenuItems } from "@/server/actions/groups";

export async function MenuListServer() {
  const menuResult = await getMenuItems();

  if (!menuResult.ok) {
    return (
      <section className="rounded-xl border border-brand-dark/20 bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-brand-dark">Menu unavailable</h2>
        <p className="mt-2 text-sm text-brand-dark/80">
          We could not load menu items right now. Please refresh and try again.
        </p>
        <p className="mt-2 text-xs text-brand-dark/60">Error: {menuResult.error.message}</p>
      </section>
    );
  }

  if (menuResult.data.length === 0) {
    return (
      <section className="rounded-xl border border-brand-dark/20 bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-brand-dark">No items available</h2>
        <p className="mt-2 text-sm text-brand-dark/80">
          Menu items have not been seeded yet. Run `supabase/seed.sql` and refresh.
        </p>
        <p className="mt-2 text-xs text-brand-dark/60">
          After seeding, reload this page to hydrate the SSR menu list.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Menu items" className="space-y-4">
      <h2 className="text-xl font-semibold text-brand-dark">Menu</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {menuResult.data.map((item, index) => (
          <MenuItemCard key={item.id} item={item} priority={index < 3} />
        ))}
      </div>
    </section>
  );
}
