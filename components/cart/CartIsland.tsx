"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CartLockBanner } from "@/components/cart/CartLockBanner";
import { ParticipantOrderSection } from "@/components/cart/ParticipantOrderSection";
import { OrderTracker } from "@/components/tracker/OrderTracker";
import { removeCartItem, upsertCartItem } from "@/server/actions/cart";
import { lockGroup, submitOrder, unlockGroup } from "@/server/actions/checkout";
import { subscribeToGroupRealtime, unsubscribeFromRealtime } from "@/lib/supabase/client";
import type { CartItemView, CartSnapshot, ParticipantCartSection } from "@/types/domain";
import type { GroupStatus } from "@/types/db";
import { Button } from "@/components/ui/button";

type CartIslandProps = {
  groupId: string;
  participantId: string;
  isHost: boolean;
  initialGroupStatus: GroupStatus;
  initialSubmittedAt: string | null;
  initialSnapshot: CartSnapshot;
};

type SyncState = "connecting" | "connected" | "reconnecting";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function CartIsland({
  groupId,
  participantId,
  isHost,
  initialGroupStatus,
  initialSubmittedAt,
  initialSnapshot
}: CartIslandProps) {
  const router = useRouter();

  const [groupStatus, setGroupStatus] = useState<GroupStatus>(initialGroupStatus);
  const [submittedAt, setSubmittedAt] = useState<string | null>(initialSubmittedAt);
  const [snapshot, setSnapshot] = useState<CartSnapshot>(initialSnapshot);
  const [syncState, setSyncState] = useState<SyncState>("connecting");
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);

  useEffect(() => {
    setGroupStatus(initialGroupStatus);
    setSubmittedAt(initialSubmittedAt);
    setSnapshot(initialSnapshot);
    setLastRefreshAt(new Date());
  }, [initialGroupStatus, initialSnapshot, initialSubmittedAt]);

  useEffect(() => {
    const refreshFromServer = () => {
      router.refresh();
      setLastRefreshAt(new Date());
    };

    const channel = subscribeToGroupRealtime({
      groupId,
      onCartChange: refreshFromServer,
      onGroupChange: refreshFromServer,
      onStatusChange: (status) => {
        if (status === "SUBSCRIBED") {
          setSyncState("connected");
          return;
        }

        if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
          setSyncState("reconnecting");
        }
      }
    });

    return () => {
      unsubscribeFromRealtime(channel);
    };
  }, [groupId, router]);

  useEffect(() => {
    if (syncState !== "reconnecting") {
      return;
    }

    const interval = window.setInterval(() => {
      router.refresh();
      setLastRefreshAt(new Date());
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [router, syncState]);

  const totalItems = useMemo(() => {
    if (snapshot.mode === "host") {
      return snapshot.sections.reduce(
        (sum, section) => sum + section.items.reduce((count, item) => count + item.quantity, 0),
        0
      );
    }

    return snapshot.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [snapshot]);

  const hostSections = useMemo<ParticipantCartSection[]>(() => {
    if (snapshot.mode !== "host") {
      return [];
    }
    return snapshot.sections;
  }, [snapshot]);

  const guestSection = useMemo<ParticipantCartSection | null>(() => {
    if (snapshot.mode !== "guest") {
      return null;
    }

    return {
      participantId: snapshot.participantId,
      participantEmail: "Your order",
      isHost: false,
      items: snapshot.items,
      subtotal: snapshot.subtotal
    };
  }, [snapshot]);

  async function runQuantityMutation(item: CartItemView, nextQuantity: number) {
    setMutationError(null);
    if (groupStatus !== "open") {
      setMutationError("Cart edits are disabled while checkout is locked or submitted.");
      return;
    }

    setPendingItemId(item.id);

    try {
      if (nextQuantity <= 0) {
        const removeResult = await removeCartItem({
          groupId,
          actorParticipantId: participantId,
          cartItemId: item.id
        });

        if (!removeResult.ok) {
          setMutationError(
            removeResult.error.code === "forbidden"
              ? "You do not have permission to remove this item."
              : removeResult.error.message
          );
          return;
        }
      } else {
        const upsertResult = await upsertCartItem({
          groupId,
          actorParticipantId: participantId,
          targetParticipantId: item.participantId,
          menuItemId: item.menuItemId,
          quantity: nextQuantity
        });

        if (!upsertResult.ok) {
          setMutationError(
            upsertResult.error.code === "forbidden"
              ? "You do not have permission to update this item."
              : upsertResult.error.message
          );
          return;
        }
      }

      router.refresh();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Cart update failed.");
    } finally {
      setPendingItemId(null);
    }
  }

  function canEditSection(section: ParticipantCartSection): boolean {
    return groupStatus === "open" && (isHost || section.participantId === participantId);
  }

  async function runCheckoutTransition(action: "lock" | "unlock" | "submit") {
    setMutationError(null);
    setCheckoutPending(true);

    try {
      const result =
        action === "lock"
          ? await lockGroup({ groupId, hostParticipantId: participantId })
          : action === "unlock"
            ? await unlockGroup({ groupId, hostParticipantId: participantId })
            : await submitOrder({ groupId, hostParticipantId: participantId });

      if (!result.ok) {
        setMutationError(result.error.message);
        return;
      }

      setGroupStatus(result.data.group.status);
      setSubmittedAt(result.data.group.submittedAt);
      router.refresh();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Checkout transition failed.");
    } finally {
      setCheckoutPending(false);
    }
  }

  return (
    <section className="rounded-xl border border-brand-dark/20 bg-background p-6 shadow-sm">
      {groupStatus === "submitted" ? (
        submittedAt ? (
          <OrderTracker submittedAt={submittedAt} />
        ) : (
          <div className="rounded-md border border-brand-dark/20 bg-brand-accent/20 px-4 py-3 text-sm text-brand-dark">
            Order was submitted, but submission timestamp is missing.
          </div>
        )
      ) : null}

      {groupStatus !== "submitted" ? (
        <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand-dark">Live Cart</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            syncState === "connected"
              ? "bg-brand-accent text-brand-dark"
              : "bg-brand-primary text-white"
          }`}
        >
          {syncState === "connected" ? "Realtime connected" : "Reconnecting..."}
        </span>
      </div>

      <p className="mt-2 text-sm text-brand-dark/80">
        Participant: <span className="font-semibold text-brand-dark">{participantId}</span>
      </p>
      <p className="mt-1 text-sm text-brand-dark/80">
        View mode: <span className="font-semibold text-brand-dark">{isHost ? "Host" : "Guest"}</span>
      </p>
      <p className="mt-1 text-sm text-brand-dark/80">
        Group status: <span className="font-semibold text-brand-dark">{groupStatus}</span>
      </p>

      <div className="mt-3">
        <CartLockBanner status={groupStatus} isHost={isHost} />
      </div>

      {snapshot.mode === "host" ? (
        <div className="mt-4 grid gap-2 text-sm text-brand-dark/80 sm:grid-cols-2">
          <p>
            Sections: <span className="font-semibold text-brand-dark">{snapshot.sections.length}</span>
          </p>
          <p>
            Items: <span className="font-semibold text-brand-dark">{totalItems}</span>
          </p>
          <p className="sm:col-span-2">
            Group total:{" "}
            <span className="font-semibold text-brand-primary">{formatCurrency(snapshot.groupTotal)}</span>
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 text-sm text-brand-dark/80 sm:grid-cols-2">
          <p>
            Items: <span className="font-semibold text-brand-dark">{totalItems}</span>
          </p>
          <p>
            Subtotal:{" "}
            <span className="font-semibold text-brand-primary">{formatCurrency(snapshot.subtotal)}</span>
          </p>
        </div>
      )}

      {mutationError ? (
        <p className="mt-3 rounded-md bg-brand-primary/10 px-3 py-2 text-sm text-brand-dark">
          {mutationError}
        </p>
      ) : null}
      {syncState === "reconnecting" ? (
        <p className="mt-3 rounded-md border border-brand-dark/20 bg-background px-3 py-2 text-sm text-brand-dark/80">
          Realtime connection lost. Using 5-second polling until sync recovers.
        </p>
      ) : null}

      {isHost ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {groupStatus === "open" ? (
            <Button type="button" onClick={() => runCheckoutTransition("lock")} disabled={checkoutPending}>
              Review Order
            </Button>
          ) : null}
          {groupStatus === "locked" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => runCheckoutTransition("unlock")}
                disabled={checkoutPending}
              >
                Back to Editing
              </Button>
              <Button
                type="button"
                variant="accent"
                onClick={() => runCheckoutTransition("submit")}
                disabled={checkoutPending}
              >
                Submit Order
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {snapshot.mode === "host"
          ? hostSections.map((section) => (
              <ParticipantOrderSection
                key={section.participantId}
                section={section}
                canEdit={canEditSection(section)}
                pendingItemId={pendingItemId}
                onIncrease={(item) => runQuantityMutation(item, item.quantity + 1)}
                onDecrease={(item) => runQuantityMutation(item, item.quantity - 1)}
                onRemove={(item) => runQuantityMutation(item, 0)}
              />
            ))
          : guestSection && (
              <ParticipantOrderSection
                section={guestSection}
                canEdit={canEditSection(guestSection)}
                pendingItemId={pendingItemId}
                onIncrease={(item) => runQuantityMutation(item, item.quantity + 1)}
                onDecrease={(item) => runQuantityMutation(item, item.quantity - 1)}
                onRemove={(item) => runQuantityMutation(item, 0)}
              />
            )}
      </div>

      <p className="mt-4 text-xs text-brand-dark/60">
        {lastRefreshAt
          ? `Last refresh: ${lastRefreshAt.toLocaleTimeString()}`
          : "Waiting for first sync..."}
      </p>
        </>
      ) : null}
    </section>
  );
}
