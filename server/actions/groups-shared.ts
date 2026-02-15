import type { ActionErrorCode, Group, MenuItem, Participant } from "@/types/domain";
import type { Database } from "@/types/db";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["participants"]["Row"];
type MenuItemRow = Database["public"]["Tables"]["menu_items"]["Row"];

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

export function toMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    imageUrl: row.image_url
  };
}

export function buildActionError(code: ActionErrorCode, message: string) {
  return { ok: false as const, error: { code, message } };
}
