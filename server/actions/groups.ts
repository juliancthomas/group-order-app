"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateCreateGroupWithHostInput } from "@/server/validators/session";
import type {
  ActionResult,
  CreateGroupWithHostInput,
  CreateGroupWithHostPayload,
  Group
} from "@/types/domain";

import type { Database } from "@/types/db";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["participants"]["Row"];

function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    hostEmail: row.host_email,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toParticipant(row: ParticipantRow) {
  return {
    id: row.id,
    groupId: row.group_id,
    email: row.email,
    isHost: row.is_host,
    createdAt: row.created_at
  };
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
  const supabase = createSupabaseServerClient();
  const result = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();

  if (result.error) {
    return {
      ok: false,
      error: {
        code: "database_error",
        message: result.error.message
      }
    };
  }

  if (!result.data) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: "Group not found."
      }
    };
  }

  return { ok: true, data: toGroup(result.data) };
}
