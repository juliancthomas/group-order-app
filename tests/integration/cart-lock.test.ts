import { describe, expect, it } from "vitest";

import { canMutateCartForGroupStatus } from "../../server/validators/cart";

describe("cart lock behavior", () => {
  it("allows cart mutations while group is open", () => {
    expect(canMutateCartForGroupStatus("open")).toBe(true);
  });

  it("denies cart mutations while group is locked", () => {
    expect(canMutateCartForGroupStatus("locked")).toBe(false);
  });

  it("denies cart mutations after submission", () => {
    expect(canMutateCartForGroupStatus("submitted")).toBe(false);
  });
});
