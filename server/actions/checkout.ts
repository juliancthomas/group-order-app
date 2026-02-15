"use server";

import { revalidatePath } from "next/cache";

import {
  buildActionError,
  toGroup
} from "@/server/actions/groups-shared";
import { assertHostParticipantForGroup } from "@/server/actions/groups";
import { isAllowedGroupStatusTransition } from "@/lib/status-transitions";
import { isUuid } from "@/server/validators/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult, CheckoutActionInput, GroupTransition } from "@/types/domain";
import type { GroupStatus } from "@/types/db";

function validateCheckoutActionInput(
  input: CheckoutActionInput
): ActionResult<CheckoutActionInput> {
  const groupId = (input.groupId ?? "").trim();
  const hostParticipantId = (input.hostParticipantId ?? "").trim();

  if (!isUuid(groupId)) {
    return buildActionError("invalid_input", "A valid group ID is required.");
  }

  if (!isUuid(hostParticipantId)) {
    return buildActionError("invalid_input", "A valid host participant ID is required.");
  }

  return {
    ok: true,
    data: { groupId, hostParticipantId }
  };
}

async function transitionGroupStatus(
  input: CheckoutActionInput,
  nextStatus: GroupStatus,
  allowedCurrentStatuses: GroupStatus[]
): Promise<ActionResult<GroupTransition>> {
  const validation = validateCheckoutActionInput(input);
  if (!validation.ok) {
    return validation;
  }

  const context = await assertHostParticipantForGroup(
    validation.data.groupId,
    validation.data.hostParticipantId
  );
  if (!context.ok) {
    return context;
  }

  const previousStatus = context.data.group.status;
  if (previousStatus === "submitted") {
    return buildActionError("conflict", "Order is already submitted and cannot be changed.");
  }

  if (
    !allowedCurrentStatuses.includes(previousStatus) ||
    !isAllowedGroupStatusTransition(previousStatus, nextStatus)
  ) {
    return buildActionError(
      "conflict",
      `Invalid transition: ${previousStatus} -> ${nextStatus}.`
    );
  }

  const supabase = createSupabaseServerClient();
  const updatePayload =
    nextStatus === "submitted"
      ? { status: nextStatus, submitted_at: new Date().toISOString() }
      : { status: nextStatus };

  const updateResult = await supabase
    .from("groups")
    .update(updatePayload)
    .eq("id", validation.data.groupId)
    .select("*")
    .single();

  if (updateResult.error) {
    return buildActionError("database_error", updateResult.error.message);
  }

  revalidatePath(`/group/${validation.data.groupId}`);

  return {
    ok: true,
    data: {
      group: toGroup(updateResult.data),
      previousStatus,
      nextStatus
    }
  };
}

export async function lockGroup(
  input: CheckoutActionInput
): Promise<ActionResult<GroupTransition>> {
  return transitionGroupStatus(input, "locked", ["open"]);
}

export async function unlockGroup(
  input: CheckoutActionInput
): Promise<ActionResult<GroupTransition>> {
  return transitionGroupStatus(input, "open", ["locked"]);
}

export async function submitOrder(
  input: CheckoutActionInput
): Promise<ActionResult<GroupTransition>> {
  return transitionGroupStatus(input, "submitted", ["open", "locked"]);
}
