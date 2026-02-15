import type { TrackerComputation, TrackerStage } from "@/types/domain";

export type ComputeTrackerStageInput = {
  submittedAt: string | null;
  serverNowIso: string;
};

export function computeTrackerStage(input: ComputeTrackerStageInput): TrackerComputation {
  if (!input.submittedAt) {
    return {
      stage: "ordered",
      elapsedSeconds: 0
    };
  }

  const submittedTime = Date.parse(input.submittedAt);
  const serverNowTime = Date.parse(input.serverNowIso);

  if (Number.isNaN(submittedTime) || Number.isNaN(serverNowTime)) {
    return {
      stage: "ordered",
      elapsedSeconds: 0
    };
  }

  const elapsedSeconds = Math.max(0, Math.floor((serverNowTime - submittedTime) / 1000));

  return {
    stage: resolveTrackerStage(elapsedSeconds),
    elapsedSeconds
  };
}

export function resolveTrackerStage(elapsedSeconds: number): TrackerStage {
  if (elapsedSeconds >= 45) {
    return "delivered";
  }

  if (elapsedSeconds >= 15) {
    return "in_progress";
  }

  return "ordered";
}
