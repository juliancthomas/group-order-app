import { revalidatePath } from "next/cache";

import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { addMenuItemToCart } from "@/server/actions/cart";
import { getMenuItems } from "@/server/actions/groups";
import type { GroupStatus } from "@/types/db";

type MenuListServerProps = {
  groupId: string;
  participantId: string;
  groupStatus: GroupStatus;
};

export async function MenuListServer({ groupId, participantId, groupStatus }: MenuListServerProps) {
  async function handleAddToCart(formData: FormData) {
    "use server";

    if (groupStatus !== "open") {
      console.warn("Add to cart blocked: group is not open");
      return;
    }

    const menuItemId = formData.get("menuItemId");
    if (typeof menuItemId !== "string" || !menuItemId) {
      console.warn("Add to cart blocked: missing menuItemId");
      return;
    }

    const result = await addMenuItemToCart({
      groupId,
      actorParticipantId: participantId,
      targetParticipantId: participantId,
      menuItemId
    });

    if (!result.ok) {
      console.error("Add to cart failed:", result.error);
      return;
    }

    revalidatePath(`/group/${groupId}`);
  }

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
      {groupStatus !== "open" ? (
        <p className="text-sm text-brand-dark/70">
          Menu is view-only while checkout is locked or submitted.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {menuResult.data.map((item, index) => (
          <form key={item.id} action={handleAddToCart}>
            <input type="hidden" name="menuItemId" value={item.id} />
            <button
              type="submit"
              className="block w-full text-left"
              disabled={groupStatus !== "open"}
              aria-label={`Add ${item.name} to cart`}
            >
              <MenuItemCard item={item} priority={index < 3} clickable={groupStatus === "open"} />
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
