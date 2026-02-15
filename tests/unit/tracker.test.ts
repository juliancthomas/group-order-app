import { describe, expect, it } from "vitest";

import { computeTrackerStage } from "../../lib/tracker";

describe("tracker stage math", () => {
  it("computes Ordered at 0s", () => {
    const submittedAt = "2026-01-01T00:00:00.000Z";
    const serverNowIso = "2026-01-01T00:00:00.000Z";

    const result = computeTrackerStage({ submittedAt, serverNowIso });

    expect(result.stage).toBe("ordered");
    expect(result.elapsedSeconds).toBe(0);
  });

  it("computes In Progress at 15s", () => {
    const submittedAt = "2026-01-01T00:00:00.000Z";
    const serverNowIso = "2026-01-01T00:00:15.000Z";

    const result = computeTrackerStage({ submittedAt, serverNowIso });

    expect(result.stage).toBe("in_progress");
    expect(result.elapsedSeconds).toBe(15);
  });

  it("computes Delivered at 45s", () => {
    const submittedAt = "2026-01-01T00:00:00.000Z";
    const serverNowIso = "2026-01-01T00:00:45.000Z";

    const result = computeTrackerStage({ submittedAt, serverNowIso });

    expect(result.stage).toBe("delivered");
    expect(result.elapsedSeconds).toBe(45);
  });
});
