"use client";

import { Activity, useEffect, useEffectEvent, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CartLockBanner } from "@/components/cart/CartLockBanner";
import { ParticipantOrderSection } from "@/components/cart/ParticipantOrderSection";
import { OrderTracker } from "@/components/tracker/OrderTracker";
import { removeCartItem, upsertCartItem } from "@/server/actions/cart";
import { generateRealtimeToken } from "@/server/actions/auth";
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
  
  const [cartMutationPending, startCartTransition] = useTransition();
  const [checkoutPending, startCheckoutTransition] = useTransition();
  
  const [optimisticSnapshot, setOptimisticSnapshot] = useOptimistic(
    snapshot,
    (currentSnapshot, optimisticUpdate: { itemId: string; quantity: number }) => {
      if (currentSnapshot.mode === "guest") {
        const updatedItems = currentSnapshot.items.map(item =>
          item.id === optimisticUpdate.itemId
            ? { ...item, quantity: optimisticUpdate.quantity }
            : item
        );
        const subtotal = updatedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        return {
          ...currentSnapshot,
          items: updatedItems,
          subtotal
        };
      }
      
      // Host mode: update the specific section
      const updatedSections = currentSnapshot.sections.map(section => {
        const updatedItems = section.items.map(item =>
          item.id === optimisticUpdate.itemId
            ? { ...item, quantity: optimisticUpdate.quantity }
            : item
        );
        const subtotal = updatedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        return {
          ...section,
          items: updatedItems,
          subtotal
        };
      });
      const groupTotal = updatedSections.reduce((sum, section) => sum + section.subtotal, 0);
      return {
        ...currentSnapshot,
        sections: updatedSections,
        groupTotal
      };
    }
  );

  // Sync server props to local state after router.refresh() updates
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    // Intentional: syncing server data to local state after refresh
    setGroupStatus(initialGroupStatus);
    setSubmittedAt(initialSubmittedAt);
    setSnapshot(initialSnapshot);
    setLastRefreshAt(new Date());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialGroupStatus, initialSnapshot, initialSubmittedAt]);

  // Extract refresh logic as an Effect Event to avoid reconnecting when router changes
  const refreshFromServer = useEffectEvent(() => {
    router.refresh();
    setLastRefreshAt(new Date());
  });

  useEffect(() => {
    let channel: ReturnType<typeof subscribeToGroupRealtime> | null = null;

    async function setupRealtimeSubscription() {
      // Fetch JWT token for RLS-aware Realtime
      const tokenResult = await generateRealtimeToken({
        participantId,
        groupId
      });

      const accessToken = tokenResult.ok ? tokenResult.data.token : undefined;

      if (!tokenResult.ok) {
        console.warn("Failed to generate Realtime token:", tokenResult.error.message);
      }

      channel = subscribeToGroupRealtime({
        groupId,
        accessToken,
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
    }

    void setupRealtimeSubscription();

    return () => {
      if (channel) {
        unsubscribeFromRealtime(channel);
      }
    };
  }, [groupId, participantId]);

  // Extract polling logic as an Effect Event to avoid restarting interval unnecessarily
  const pollServerForUpdates = useEffectEvent(() => {
    router.refresh();
    setLastRefreshAt(new Date());
  });

  useEffect(() => {
    if (syncState !== "reconnecting") {
      return;
    }

    const interval = window.setInterval(() => {
      pollServerForUpdates();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [syncState]);

  const totalItems = useMemo(() => {
    if (optimisticSnapshot.mode === "host") {
      return optimisticSnapshot.sections.reduce(
        (sum, section) => sum + section.items.reduce((count, item) => count + item.quantity, 0),
        0
      );
    }

    return optimisticSnapshot.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [optimisticSnapshot]);

  const hostSections = useMemo<ParticipantCartSection[]>(() => {
    if (optimisticSnapshot.mode !== "host") {
      return [];
    }
    return optimisticSnapshot.sections;
  }, [optimisticSnapshot]);

  const guestSection = useMemo<ParticipantCartSection | null>(() => {
    if (optimisticSnapshot.mode !== "guest") {
      return null;
    }

    return {
      participantId: optimisticSnapshot.participantId,
      participantEmail: "Your order",
      isHost: false,
      items: optimisticSnapshot.items,
      subtotal: optimisticSnapshot.subtotal
    };
  }, [optimisticSnapshot]);

  async function runQuantityMutation(item: CartItemView, nextQuantity: number) {
    setMutationError(null);
    if (groupStatus !== "open") {
      setMutationError("Cart edits are disabled while checkout is locked or submitted.");
      return;
    }

    setPendingItemId(item.id);

    startCartTransition(async () => {
      setOptimisticSnapshot({ itemId: item.id, quantity: nextQuantity });

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
            setPendingItemId(null);
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
            setPendingItemId(null);
            return;
          }
        }

        router.refresh();
        setPendingItemId(null);
      } catch (error) {
        setMutationError(error instanceof Error ? error.message : "Cart update failed.");
        setPendingItemId(null);
      }
    });
  }

  function canEditSection(section: ParticipantCartSection): boolean {
    return groupStatus === "open" && (isHost || section.participantId === participantId);
  }

  async function runCheckoutTransition(action: "lock" | "unlock" | "submit") {
    setMutationError(null);

    startCheckoutTransition(async () => {
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
      }
    });
  }

  return (
    <section className="rounded-xl border border-brand-dark/20 bg-background p-6 shadow-sm">
      <Activity mode={groupStatus === "submitted" ? "visible" : "hidden"}>
        {submittedAt ? (
          <OrderTracker submittedAt={submittedAt} />
        ) : (
          <div className="rounded-md border border-brand-dark/20 bg-brand-accent/20 px-4 py-3 text-sm text-brand-dark">
            Order was submitted, but submission timestamp is missing.
          </div>
        )}
      </Activity>

      <Activity mode={groupStatus !== "submitted" ? "visible" : "hidden"}>
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

        {optimisticSnapshot.mode === "host" ? (
          <div className="mt-4 grid gap-2 text-sm text-brand-dark/80 sm:grid-cols-2">
            <p>
              Sections: <span className="font-semibold text-brand-dark">{optimisticSnapshot.sections.length}</span>
            </p>
            <p>
              Items: <span className="font-semibold text-brand-dark">{totalItems}</span>
            </p>
            <p className="sm:col-span-2">
              Group total:{" "}
              <span className="font-semibold text-brand-primary">{formatCurrency(optimisticSnapshot.groupTotal)}</span>
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-2 text-sm text-brand-dark/80 sm:grid-cols-2">
            <p>
              Items: <span className="font-semibold text-brand-dark">{totalItems}</span>
            </p>
            <p>
              Subtotal:{" "}
              <span className="font-semibold text-brand-primary">{formatCurrency(optimisticSnapshot.subtotal)}</span>
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
          {optimisticSnapshot.mode === "host"
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
      </Activity>
    </section>
  );
}
