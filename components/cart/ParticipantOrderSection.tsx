"use client";

import { Button } from "@/components/ui/button";
import type { CartItemView, ParticipantCartSection } from "@/types/domain";

type ParticipantOrderSectionProps = {
  section: ParticipantCartSection;
  canEdit: boolean;
  pendingItemId?: string | null;
  onIncrease: (item: CartItemView) => void;
  onDecrease: (item: CartItemView) => void;
  onRemove: (item: CartItemView) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function ParticipantOrderSection({
  section,
  canEdit,
  pendingItemId,
  onIncrease,
  onDecrease,
  onRemove
}: ParticipantOrderSectionProps) {
  return (
    <article className="rounded-xl border border-brand-dark/20 bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-brand-dark">{section.participantEmail}</h3>
        <p className="text-sm font-semibold text-brand-primary">
          {formatCurrency(section.subtotal)}
        </p>
      </div>

      {section.items.length === 0 ? (
        <p className="mt-3 text-sm text-brand-dark/70">No items in this order yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {section.items.map((item) => {
            const rowPending = pendingItemId === item.id;
            return (
              <li
                key={item.id}
                className="rounded-md border border-brand-dark/10 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-brand-dark">{item.menuItemName}</p>
                    <p className="text-xs text-brand-dark/70">
                      {formatCurrency(item.unitPrice)} each
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-brand-dark">x{item.quantity}</p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDecrease(item)}
                    disabled={!canEdit || rowPending}
                  >
                    -
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onIncrease(item)}
                    disabled={!canEdit || rowPending}
                  >
                    +
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(item)}
                    disabled={!canEdit || rowPending}
                  >
                    Remove
                  </Button>
                  {!canEdit ? (
                    <span className="text-xs text-brand-dark/70">Not allowed for your role</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
