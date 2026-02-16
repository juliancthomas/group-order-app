import type { GroupStatus } from "@/types/db";

export type Group = {
  id: string;
  hostEmail: string;
  status: GroupStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Participant = {
  id: string;
  groupId: string;
  email: string;
  isHost: boolean;
  createdAt: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
};

export type CartItem = {
  id: string;
  groupId: string;
  participantId: string;
  menuItemId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type CartItemView = {
  id: string;
  participantId: string;
  participantEmail: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
};

export type ParticipantCartSection = {
  participantId: string;
  participantEmail: string;
  isHost: boolean;
  items: CartItemView[];
  subtotal: number;
};

export type HostCartSnapshot = {
  mode: "host";
  sections: ParticipantCartSection[];
  groupTotal: number;
};

export type GuestCartSnapshot = {
  mode: "guest";
  participantId: string;
  items: CartItemView[];
  subtotal: number;
};

export type CartSnapshot = HostCartSnapshot | GuestCartSnapshot;

export type TrackerStage = "ordered" | "in_progress" | "delivered";

export type TrackerComputation = {
  stage: TrackerStage;
  elapsedSeconds: number;
};

export type ActionErrorCode =
  | "invalid_input"
  | "not_found"
  | "forbidden"
  | "conflict"
  | "database_error"
  | "server_error";

export type ActionError = {
  code: ActionErrorCode;
  message: string;
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

export type CreateGroupWithHostInput = {
  hostEmail: string;
};

export type CreateGroupWithHostPayload = {
  group: Group;
  participant: Participant;
};

export type JoinOrResumeParticipantInput = {
  groupId: string;
  email: string;
};

export type JoinOrResumeParticipantPayload = {
  participant: Participant;
  isNew: boolean;
};

export type ListParticipantsInput = {
  groupId: string;
};

export type GetCartSnapshotInput = {
  groupId: string;
  requesterParticipantId: string;
};

export type UpsertCartItemInput = {
  groupId: string;
  actorParticipantId: string;
  targetParticipantId: string;
  menuItemId: string;
  quantity: number;
};

export type RemoveCartItemInput = {
  groupId: string;
  actorParticipantId: string;
  cartItemId: string;
};

export type RemoveCartItemPayload = {
  success: true;
  cartItemId: string;
};

export type CheckoutActionInput = {
  groupId: string;
  hostParticipantId: string;
};

export type GroupTransition = {
  group: Group;
  previousStatus: GroupStatus;
  nextStatus: GroupStatus;
};
