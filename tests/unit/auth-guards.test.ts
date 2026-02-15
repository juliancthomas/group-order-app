import { describe, expect, it } from "vitest";

import { canActorMutateTarget } from "../../server/validators/cart";

describe("auth guards", () => {
  it("guest cannot mutate foreign participant cart item", () => {
    const canMutate = canActorMutateTarget(false, "guest-participant", "other-participant");
    expect(canMutate).toBe(false);
  });

  it("host can mutate any participant cart item", () => {
    const canMutate = canActorMutateTarget(true, "host-participant", "guest-participant");
    expect(canMutate).toBe(true);
  });
});
