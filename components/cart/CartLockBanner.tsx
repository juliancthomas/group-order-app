"use client";

import type { GroupStatus } from "@/types/db";

type CartLockBannerProps = {
  status: GroupStatus;
  isHost: boolean;
};

export function CartLockBanner({ status, isHost }: CartLockBannerProps) {
  if (status === "open") {
    return null;
  }

  if (status === "submitted") {
    return (
      <div className="rounded-md border border-brand-dark/20 bg-brand-accent/30 px-4 py-3 text-sm text-brand-dark">
        Order submitted. Cart changes are disabled for all participants.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-brand-dark/20 bg-brand-primary/10 px-4 py-3 text-sm text-brand-dark">
      {isHost
        ? "Cart is locked for checkout review. Guests cannot edit until you unlock."
        : "Cart is locked - the host is reviewing the order."}
    </div>
  );
}
