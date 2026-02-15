import type {
  ActionResult,
  CreateGroupWithHostInput,
  JoinOrResumeParticipantInput,
  ListParticipantsInput
} from "@/types/domain";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) {
    return false;
  }

  return EMAIL_PATTERN.test(email);
}

export function validateCreateGroupWithHostInput(
  input: CreateGroupWithHostInput
): ActionResult<{ hostEmail: string }> {
  const hostEmail = normalizeEmail(input.hostEmail ?? "");

  if (!isValidEmail(hostEmail)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "A valid host email is required."
      }
    };
  }

  return { ok: true, data: { hostEmail } };
}

export function validateJoinOrResumeParticipantInput(
  input: JoinOrResumeParticipantInput
): ActionResult<{ groupId: string; email: string }> {
  const groupId = (input.groupId ?? "").trim();
  const email = normalizeEmail(input.email ?? "");

  if (!isUuid(groupId)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "A valid group ID is required."
      }
    };
  }

  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "A valid participant email is required."
      }
    };
  }

  return { ok: true, data: { groupId, email } };
}

export function validateListParticipantsInput(
  input: ListParticipantsInput
): ActionResult<{ groupId: string }> {
  const groupId = (input.groupId ?? "").trim();

  if (!isUuid(groupId)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "A valid group ID is required."
      }
    };
  }

  return { ok: true, data: { groupId } };
}
