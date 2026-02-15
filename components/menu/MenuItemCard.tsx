import Image from "next/image";

import type { MenuItem } from "@/types/domain";

type MenuItemCardProps = {
  item: MenuItem;
  priority?: boolean;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function MenuItemCard({ item, priority = false }: MenuItemCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-brand-dark/20 bg-background shadow-sm">
      <div className="relative aspect-[16/10] w-full bg-brand-dark/5">
        <Image
          src={item.imageUrl}
          alt={`${item.name} menu item`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={priority}
        />
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-brand-dark">{item.name}</h3>
          <p className="text-sm font-semibold text-brand-primary">{formatCurrency(item.price)}</p>
        </div>
        <p className="text-sm text-brand-dark/80">{item.description}</p>
      </div>
    </article>
  );
}
