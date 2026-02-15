"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  validateJoinOrResumeParticipantInput,
  validateListParticipantsInput
} from "@/server/validators/session";
import type {
  ActionResult,
  JoinOrResumeParticipantInput,
  JoinOrResumeParticipantPayload,
  ListParticipantsInput,
  Participant
} from "@/types/domain";
import type { Database } from "@/types/db";

type ParticipantRow = Database["public"]["Tables"]["participants"]["Row"];
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];

function toParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    groupId: row.group_id,
    email: row.email,
    isHost: row.is_host,
    createdAt: row.created_at
  };
}

function isDuplicateParticipantError(code?: string, message?: string): boolean {
  return code === "23505" || message?.toLowerCase().includes("duplicate key") === true;
}

async function ensureGroupOpen(groupId: string): Promise<ActionResult<GroupRow>> {
  const supabase = createSupabaseServerClient();
  const groupQuery = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();

  if (groupQuery.error) {
    return {
      ok: false,
      error: {
        code: "database_error",
        message: groupQuery.error.message
      }
    };
  }

  if (!groupQuery.data) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: "Group not found."
      }
    };
  }

  if (groupQuery.data.status !== "open") {
    return {
      ok: false,
      error: {
        code: "forbidden",
        message: "Group is not open for new participants."
      }
    };
  }

  return { ok: true, data: groupQuery.data };
}

export async function joinOrResumeParticipant(
  input: JoinOrResumeParticipantInput
): Promise<ActionResult<JoinOrResumeParticipantPayload>> {
  const validation = validateJoinOrResumeParticipantInput(input);
  if (!validation.ok) {
    return validation;
  }

  const groupCheck = await ensureGroupOpen(validation.data.groupId);
  if (!groupCheck.ok) {
    return groupCheck;
  }

  const supabase = createSupabaseServerClient();

  const existingParticipant = await supabase
    .from("participants")
    .select("*")
    .eq("group_id", validation.data.groupId)
    .eq("email", validation.data.email)
    .maybeSingle();

  if (existingParticipant.error) {
    return {
      ok: false,
      error: {
        code: "database_error",
        message: existingParticipant.error.message
      }
    };
  }

  if (existingParticipant.data) {
    return {
      ok: true,
      data: {
        participant: toParticipant(existingParticipant.data),
        isNew: false
      }
    };
  }

  const createResult = await supabase
    .from("participants")
    .insert({
      group_id: validation.data.groupId,
      email: validation.data.email,
      is_host: false
    })
    .select("*")
    .single();

  if (createResult.error) {
    // If another request inserted the same participant first, re-read and resume.
    if (isDuplicateParticipantError(createResult.error.code, createResult.error.message)) {
      const racedExisting = await supabase
        .from("participants")
        .select("*")
        .eq("group_id", validation.data.groupId)
        .eq("email", validation.data.email)
        .maybeSingle();

      if (!racedExisting.error && racedExisting.data) {
        return {
          ok: true,
          data: {
            participant: toParticipant(racedExisting.data),
            isNew: false
          }
        };
      }
    }

    return {
      ok: false,
      error: {
        code: "database_error",
        message: createResult.error.message
      }
    };
  }

  return {
    ok: true,
    data: {
      participant: toParticipant(createResult.data),
      isNew: true
    }
  };
}

export async function listParticipants(
  input: ListParticipantsInput
): Promise<ActionResult<Participant[]>> {
  const validation = validateListParticipantsInput(input);
  if (!validation.ok) {
    return validation;
  }

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("participants")
    .select("*")
    .eq("group_id", validation.data.groupId)
    .order("is_host", { ascending: false })
    .order("created_at", { ascending: true });

  if (result.error) {
    return {
      ok: false,
      error: {
        code: "database_error",
        message: result.error.message
      }
    };
  }

  return {
    ok: true,
    data: result.data.map(toParticipant)
  };
}
