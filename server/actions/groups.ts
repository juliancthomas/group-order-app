"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateCreateGroupWithHostInput } from "@/server/validators/session";
import type {
  ActionResult,
  CreateGroupWithHostInput,
  CreateGroupWithHostPayload,
  Group,
  Participant
} from "@/types/domain";

import type { Database } from "@/types/db";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["participants"]["Row"];

export function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    hostEmail: row.host_email,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    groupId: row.group_id,
    email: row.email,
    isHost: row.is_host,
    createdAt: row.created_at
  };
}

export function buildActionError(
  code: "invalid_input" | "not_found" | "forbidden" | "conflict" | "database_error",
  message: string
) {
  return { ok: false as const, error: { code, message } };
}

export async function getGroupRowById(groupId: string): Promise<ActionResult<GroupRow>> {
  const supabase = createSupabaseServerClient();
  const result = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();

  if (result.error) {
    return buildActionError("database_error", result.error.message);
  }
  if (!result.data) {
    return buildActionError("not_found", "Group not found.");
  }

  return { ok: true, data: result.data };
}

export async function getParticipantRowById(
  participantId: string
): Promise<ActionResult<ParticipantRow>> {
  const supabase = createSupabaseServerClient();
  const result = await supabase.from("participants").select("*").eq("id", participantId).maybeSingle();

  if (result.error) {
    return buildActionError("database_error", result.error.message);
  }
  if (!result.data) {
    return buildActionError("not_found", "Participant not found.");
  }

  return { ok: true, data: result.data };
}

export async function getGroupParticipantContext(
  groupId: string,
  participantId: string
): Promise<ActionResult<{ group: GroupRow; participant: ParticipantRow }>> {
  const [groupResult, participantResult] = await Promise.all([
    getGroupRowById(groupId),
    getParticipantRowById(participantId)
  ]);

  if (!groupResult.ok) {
    return groupResult;
  }
  if (!participantResult.ok) {
    return participantResult;
  }
  if (participantResult.data.group_id !== groupResult.data.id) {
    return buildActionError("forbidden", "Participant does not belong to this group.");
  }

  return {
    ok: true,
    data: {
      group: groupResult.data,
      participant: participantResult.data
    }
  };
}

export async function assertHostParticipantForGroup(
  groupId: string,
  participantId: string
): Promise<ActionResult<{ group: GroupRow; participant: ParticipantRow }>> {
  const context = await getGroupParticipantContext(groupId, participantId);
  if (!context.ok) {
    return context;
  }

  if (!context.data.participant.is_host) {
    return buildActionError("forbidden", "Only the host can perform this action.");
  }

  return context;
}

export async function createGroupWithHost(
  input: CreateGroupWithHostInput
): Promise<ActionResult<CreateGroupWithHostPayload>> {
  const validation = validateCreateGroupWithHostInput(input);
  if (!validation.ok) {
    return validation;
  }

  const supabase = createSupabaseServerClient();

  const groupInsert = await supabase
    .from("groups")
    .insert({ host_email: validation.data.hostEmail })
    .select("*")
    .single();

  if (groupInsert.error) {
    return {
      ok: false,
      error: {
        code: "database_error",
        message: groupInsert.error.message
      }
    };
  }

  const participantInsert = await supabase
    .from("participants")
    .insert({
      group_id: groupInsert.data.id,
      email: validation.data.hostEmail,
      is_host: true
    })
    .select("*")
    .single();

  if (participantInsert.error) {
    // Compensating action to avoid orphan groups if participant creation fails.
    await supabase.from("groups").delete().eq("id", groupInsert.data.id);

    return {
      ok: false,
      error: {
        code: "database_error",
        message: participantInsert.error.message
      }
    };
  }

  return {
    ok: true,
    data: {
      group: toGroup(groupInsert.data),
      participant: toParticipant(participantInsert.data)
    }
  };
}

export async function getGroupById(groupId: string): Promise<ActionResult<Group>> {
  const result = await getGroupRowById(groupId);
  if (!result.ok) {
    return result;
  }

  return { ok: true, data: toGroup(result.data) };
}
