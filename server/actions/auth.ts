"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/domain";

type GenerateRealtimeTokenInput = {
  participantId: string;
  groupId: string;
};

type RealtimeTokenPayload = {
  token: string;
  expiresAt: number;
};

/**
 * Generates a temporary JWT token for Realtime subscriptions.
 * This token includes participant claims needed for RLS policies.
 */
export async function generateRealtimeToken(
  input: GenerateRealtimeTokenInput
): Promise<ActionResult<RealtimeTokenPayload>> {
  const supabase = createSupabaseServerClient();

  // Fetch participant details to include in claims
  const { data: participant, error } = await supabase
    .from("participants")
    .select("id, group_id, email, is_host")
    .eq("id", input.participantId)
    .eq("group_id", input.groupId)
    .maybeSingle();

  if (error || !participant) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: "Participant not found or unauthorized."
      }
    };
  }

  // Generate custom claims for Realtime
  const claims = {
    participant_id: participant.id,
    group_id: participant.group_id,
    email: participant.email,
    is_host: participant.is_host,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
  };

  // Use Supabase to sign the token with the proper secret
  // Note: This requires the JWT secret which is only available server-side
  const jwt = require("jsonwebtoken");
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!jwtSecret) {
    return {
      ok: false,
      error: {
        code: "server_error",
        message: "JWT secret not configured."
      }
    };
  }

  try {
    const token = jwt.sign(claims, jwtSecret, {
      algorithm: "HS256"
    });

    return {
      ok: true,
      data: {
        token,
        expiresAt: claims.exp * 1000
      }
    };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "server_error",
        message: err instanceof Error ? err.message : "Failed to generate token."
      }
    };
  }
}
