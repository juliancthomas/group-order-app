"use client";

import { useEffect, useMemo, useState } from "react";

import { computeTrackerStage } from "@/lib/tracker";
import { getServerNowIso } from "@/server/actions/groups";
import type { TrackerStage } from "@/types/domain";

type OrderTrackerProps = {
  submittedAt: string;
};

type StageDefinition = {
  id: TrackerStage;
  label: string;
  startsAt: number;
};

const STAGES: StageDefinition[] = [
  { id: "ordered", label: "Ordered", startsAt: 0 },
  { id: "in_progress", label: "In Progress", startsAt: 15 },
  { id: "delivered", label: "Delivered", startsAt: 45 }
];

function getStageIndex(stage: TrackerStage): number {
  return STAGES.findIndex((item) => item.id === stage);
}

export function OrderTracker({ submittedAt }: OrderTrackerProps) {
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function syncServerClock() {
      try {
        const serverNow = await getServerNowIso();
        const serverNowMs = Date.parse(serverNow);
        if (!Number.isNaN(serverNowMs) && mounted) {
          setServerOffsetMs(serverNowMs - Date.now());
        }
      } catch {
        // If server clock helper fails, continue with local time fallback.
      }
    }

    void syncServerClock();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // Compute current server time (tick triggers re-computation every second)
  const serverNowIso = useMemo(
    () => new Date(Date.now() + serverOffsetMs).toISOString(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serverOffsetMs, tick]
  );

  const tracker = useMemo(() => {
    return computeTrackerStage({ submittedAt, serverNowIso });
  }, [submittedAt, serverNowIso]);

  const activeIndex = getStageIndex(tracker.stage);

  return (
    <section className="rounded-xl border border-brand-dark/20 bg-background p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-brand-dark">Order Tracker</h2>
      <p className="mt-2 text-sm text-brand-dark/80">
        Shared timeline based on submission timestamp.
      </p>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {STAGES.map((stage, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;

          return (
            <li
              key={stage.id}
              className={`rounded-lg border p-4 ${
                isActive
                  ? "border-brand-primary bg-brand-primary/10"
                  : isCompleted
                    ? "border-brand-accent bg-brand-accent/25"
                    : "border-brand-dark/20 bg-background"
              }`}
            >
              <p className="text-sm font-semibold text-brand-dark">{stage.label}</p>
              <p className="mt-1 text-xs text-brand-dark/70">Starts at {stage.startsAt}s</p>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-sm text-brand-dark/80">
        Current stage: <span className="font-semibold text-brand-dark">{tracker.stage}</span>
      </p>
      <p className="mt-1 text-xs text-brand-dark/70">
        Elapsed time since submit: {tracker.elapsedSeconds}s
      </p>
    </section>
  );
}
