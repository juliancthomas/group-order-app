import type { TrackerComputation, TrackerStage } from "@/types/domain";

export type ComputeTrackerStageInput = {
  submittedAt: string | null;
  serverNowIso: string;
};

/**
 * Placeholder implementation for Step 3.
 * Full stage transition thresholds are implemented in Step 16.
 */
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
    stage: resolvePlaceholderStage(elapsedSeconds),
    elapsedSeconds
  };
}

function resolvePlaceholderStage(_elapsedSeconds: number): TrackerStage {
  return "ordered";
}
