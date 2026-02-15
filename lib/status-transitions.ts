import type { GroupStatus } from "@/types/db";

export function isAllowedGroupStatusTransition(
  from: GroupStatus,
  to: GroupStatus
): boolean {
  if (from === "submitted") {
    return false;
  }

  if (from === to) {
    return true;
  }

  if (from === "open" && (to === "locked" || to === "submitted")) {
    return true;
  }

  if (from === "locked" && (to === "open" || to === "submitted")) {
    return true;
  }

  return false;
}
