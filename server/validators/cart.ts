import type {
  ActionResult,
  GetCartSnapshotInput,
  RemoveCartItemInput,
  UpsertCartItemInput
} from "@/types/domain";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function clampQuantity(quantity: number): number {
  return Math.min(99, Math.max(1, quantity));
}

function validateUuidField(value: string, fieldName: string): ActionResult<{ value: string }> {
  const normalized = value.trim();
  if (!isUuid(normalized)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: `A valid ${fieldName} is required.`
      }
    };
  }

  return { ok: true, data: { value: normalized } };
}

export function validateGetCartSnapshotInput(
  input: GetCartSnapshotInput
): ActionResult<GetCartSnapshotInput> {
  const groupIdResult = validateUuidField(input.groupId ?? "", "group ID");
  if (!groupIdResult.ok) {
    return groupIdResult;
  }

  const requesterIdResult = validateUuidField(
    input.requesterParticipantId ?? "",
    "requester participant ID"
  );
  if (!requesterIdResult.ok) {
    return requesterIdResult;
  }

  return {
    ok: true,
    data: {
      groupId: groupIdResult.data.value,
      requesterParticipantId: requesterIdResult.data.value
    }
  };
}

export function validateUpsertCartItemInput(
  input: UpsertCartItemInput
): ActionResult<UpsertCartItemInput> {
  const groupIdResult = validateUuidField(input.groupId ?? "", "group ID");
  if (!groupIdResult.ok) {
    return groupIdResult;
  }

  const actorIdResult = validateUuidField(input.actorParticipantId ?? "", "actor participant ID");
  if (!actorIdResult.ok) {
    return actorIdResult;
  }

  const targetIdResult = validateUuidField(
    input.targetParticipantId ?? "",
    "target participant ID"
  );
  if (!targetIdResult.ok) {
    return targetIdResult;
  }

  const menuItemIdResult = validateUuidField(input.menuItemId ?? "", "menu item ID");
  if (!menuItemIdResult.ok) {
    return menuItemIdResult;
  }

  if (!Number.isFinite(input.quantity)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "Quantity must be a finite number."
      }
    };
  }

  if (Math.abs(input.quantity) > 1000000) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "Quantity is outside a safe numeric range."
      }
    };
  }

  return {
    ok: true,
    data: {
      groupId: groupIdResult.data.value,
      actorParticipantId: actorIdResult.data.value,
      targetParticipantId: targetIdResult.data.value,
      menuItemId: menuItemIdResult.data.value,
      quantity: clampQuantity(Math.round(input.quantity))
    }
  };
}

export function validateRemoveCartItemInput(
  input: RemoveCartItemInput
): ActionResult<RemoveCartItemInput> {
  const groupIdResult = validateUuidField(input.groupId ?? "", "group ID");
  if (!groupIdResult.ok) {
    return groupIdResult;
  }

  const actorIdResult = validateUuidField(input.actorParticipantId ?? "", "actor participant ID");
  if (!actorIdResult.ok) {
    return actorIdResult;
  }

  const cartItemIdResult = validateUuidField(input.cartItemId ?? "", "cart item ID");
  if (!cartItemIdResult.ok) {
    return cartItemIdResult;
  }

  return {
    ok: true,
    data: {
      groupId: groupIdResult.data.value,
      actorParticipantId: actorIdResult.data.value,
      cartItemId: cartItemIdResult.data.value
    }
  };
}

export function canActorMutateTarget(isActorHost: boolean, actorId: string, targetId: string): boolean {
  return isActorHost || actorId === targetId;
}
