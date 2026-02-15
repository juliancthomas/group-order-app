import Image from "next/image";

import type { MenuItem } from "@/types/domain";

type MenuItemCardProps = {
  item: MenuItem;
  priority?: boolean;
};

const MENU_FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'%3E%3Crect width='800' height='500' fill='%23f4f4f5'/%3E%3Ctext x='50%25' y='50%25' fill='%2326282A' font-family='Arial,sans-serif' font-size='28' text-anchor='middle' dominant-baseline='middle'%3EMenu Image Unavailable%3C/text%3E%3C/svg%3E";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function getSafeImageSrc(value: string): string {
  try {
    const normalized = value.trim();
    if (!normalized) {
      return MENU_FALLBACK_IMAGE;
    }

    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return MENU_FALLBACK_IMAGE;
    }

    return parsed.toString();
  } catch {
    return MENU_FALLBACK_IMAGE;
  }
}

export function MenuItemCard({ item, priority = false }: MenuItemCardProps) {
  const imageSrc = getSafeImageSrc(item.imageUrl);

  return (
    <article className="overflow-hidden rounded-xl border border-brand-dark/20 bg-background shadow-sm">
      <div className="relative aspect-[16/10] w-full bg-brand-dark/5">
        <Image
          src={imageSrc}
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
