import { describe, expect, it } from "vitest";

import { isAllowedGroupStatusTransition } from "../../lib/status-transitions";

describe("status transition matrix", () => {
  it("allows open -> locked", () => {
    expect(isAllowedGroupStatusTransition("open", "locked")).toBe(true);
  });

  it("allows locked -> submitted", () => {
    expect(isAllowedGroupStatusTransition("locked", "submitted")).toBe(true);
  });

  it("disallows submitted -> open", () => {
    expect(isAllowedGroupStatusTransition("submitted", "open")).toBe(false);
  });
});
