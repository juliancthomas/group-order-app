"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ParticipantOrderSection } from "@/components/cart/ParticipantOrderSection";
import { removeCartItem, upsertCartItem } from "@/server/actions/cart";
import { subscribeToGroupRealtime, unsubscribeFromRealtime } from "@/lib/supabase/client";
import type { CartItemView, CartSnapshot, ParticipantCartSection } from "@/types/domain";

type CartIslandProps = {
  groupId: string;
  participantId: string;
  isHost: boolean;
  initialSnapshot: CartSnapshot;
};

type SyncState = "connecting" | "connected" | "reconnecting";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function CartIsland({ groupId, participantId, isHost, initialSnapshot }: CartIslandProps) {
  const router = useRouter();

  const [snapshot, setSnapshot] = useState<CartSnapshot>(initialSnapshot);
  const [syncState, setSyncState] = useState<SyncState>("connecting");
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  useEffect(() => {
    setSnapshot(initialSnapshot);
    setLastRefreshAt(new Date());
  }, [initialSnapshot]);

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
    setPendingItemId(item.id);

    try {
      if (nextQuantity <= 0) {
        const removeResult = await removeCartItem({
          groupId,
          actorParticipantId: participantId,
          cartItemId: item.id
        });

        if (!removeResult.ok) {
          setMutationError(removeResult.error.message);
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
          setMutationError(upsertResult.error.message);
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
    return isHost || section.participantId === participantId;
  }

  return (
    <section className="rounded-xl border border-brand-dark/20 bg-background p-6 shadow-sm">
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
    </section>
  );
}
