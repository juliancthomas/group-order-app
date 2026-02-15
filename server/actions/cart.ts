"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canActorMutateTarget,
  validateGetCartSnapshotInput,
  validateRemoveCartItemInput,
  validateUpsertCartItemInput
} from "@/server/validators/cart";
import type {
  ActionResult,
  CartItem,
  CartItemView,
  CartSnapshot,
  GetCartSnapshotInput,
  Participant,
  RemoveCartItemInput,
  RemoveCartItemPayload,
  UpsertCartItemInput
} from "@/types/domain";
import type { Database } from "@/types/db";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["participants"]["Row"];
type MenuItemRow = Database["public"]["Tables"]["menu_items"]["Row"];
type CartItemRow = Database["public"]["Tables"]["cart_items"]["Row"];

function toParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    groupId: row.group_id,
    email: row.email,
    isHost: row.is_host,
    createdAt: row.created_at
  };
}

function toCartItem(row: CartItemRow): CartItem {
  return {
    id: row.id,
    groupId: row.group_id,
    participantId: row.participant_id,
    menuItemId: row.menu_item_id,
    quantity: row.quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildActionError(
  code: "invalid_input" | "not_found" | "forbidden" | "conflict" | "database_error",
  message: string
) {
  return { ok: false as const, error: { code, message } };
}

async function getGroupById(groupId: string): Promise<ActionResult<GroupRow>> {
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

async function getParticipantById(participantId: string): Promise<ActionResult<ParticipantRow>> {
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

async function getGroupAndRequester(
  groupId: string,
  requesterParticipantId: string
): Promise<ActionResult<{ group: GroupRow; requester: ParticipantRow }>> {
  const [groupResult, requesterResult] = await Promise.all([
    getGroupById(groupId),
    getParticipantById(requesterParticipantId)
  ]);

  if (!groupResult.ok) {
    return groupResult;
  }
  if (!requesterResult.ok) {
    return requesterResult;
  }
  if (requesterResult.data.group_id !== groupResult.data.id) {
    return buildActionError("forbidden", "Participant does not belong to this group.");
  }

  return {
    ok: true,
    data: {
      group: groupResult.data,
      requester: requesterResult.data
    }
  };
}

function buildCartViews(
  cartRows: CartItemRow[],
  participantsById: Map<string, ParticipantRow>,
  menuItemsById: Map<string, MenuItemRow>
): CartItemView[] {
  const views: CartItemView[] = [];

  for (const cartRow of cartRows) {
    const participant = participantsById.get(cartRow.participant_id);
    const menuItem = menuItemsById.get(cartRow.menu_item_id);
    if (!participant || !menuItem) {
      continue;
    }

    views.push({
      id: cartRow.id,
      participantId: cartRow.participant_id,
      participantEmail: participant.email,
      menuItemId: cartRow.menu_item_id,
      menuItemName: menuItem.name,
      quantity: cartRow.quantity,
      unitPrice: menuItem.price
    });
  }

  return views;
}

export async function getCartSnapshot(
  input: GetCartSnapshotInput
): Promise<ActionResult<CartSnapshot>> {
  const validation = validateGetCartSnapshotInput(input);
  if (!validation.ok) {
    return validation;
  }

  const contextResult = await getGroupAndRequester(
    validation.data.groupId,
    validation.data.requesterParticipantId
  );
  if (!contextResult.ok) {
    return contextResult;
  }

  const supabase = createSupabaseServerClient();
  const participantsQuery = await supabase
    .from("participants")
    .select("*")
    .eq("group_id", validation.data.groupId)
    .order("is_host", { ascending: false })
    .order("created_at", { ascending: true });

  if (participantsQuery.error) {
    return buildActionError("database_error", participantsQuery.error.message);
  }

  const cartItemsQuery = await supabase
    .from("cart_items")
    .select("*")
    .eq("group_id", validation.data.groupId)
    .order("created_at", { ascending: true });

  if (cartItemsQuery.error) {
    return buildActionError("database_error", cartItemsQuery.error.message);
  }

  const menuItemIds = [...new Set(cartItemsQuery.data.map((row) => row.menu_item_id))];
  const menuItemsById = new Map<string, MenuItemRow>();

  if (menuItemIds.length > 0) {
    const menuItemsQuery = await supabase.from("menu_items").select("*").in("id", menuItemIds);
    if (menuItemsQuery.error) {
      return buildActionError("database_error", menuItemsQuery.error.message);
    }

    for (const menuItem of menuItemsQuery.data) {
      menuItemsById.set(menuItem.id, menuItem);
    }
  }

  const participantsById = new Map<string, ParticipantRow>();
  for (const participant of participantsQuery.data) {
    participantsById.set(participant.id, participant);
  }

  const itemViews = buildCartViews(cartItemsQuery.data, participantsById, menuItemsById);
  const requester = contextResult.data.requester;

  if (requester.is_host) {
    const sections = participantsQuery.data.map((participant) => {
      const items = itemViews.filter((item) => item.participantId === participant.id);
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      return {
        participantId: participant.id,
        participantEmail: participant.email,
        isHost: participant.is_host,
        items,
        subtotal
      };
    });

    const groupTotal = sections.reduce((sum, section) => sum + section.subtotal, 0);

    return {
      ok: true,
      data: {
        mode: "host",
        sections,
        groupTotal
      }
    };
  }

  const guestItems = itemViews.filter((item) => item.participantId === requester.id);
  const subtotal = guestItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return {
    ok: true,
    data: {
      mode: "guest",
      participantId: requester.id,
      items: guestItems,
      subtotal
    }
  };
}

export async function upsertCartItem(
  input: UpsertCartItemInput
): Promise<ActionResult<CartItem>> {
  const validation = validateUpsertCartItemInput(input);
  if (!validation.ok) {
    return validation;
  }

  const contextResult = await getGroupAndRequester(
    validation.data.groupId,
    validation.data.actorParticipantId
  );
  if (!contextResult.ok) {
    return contextResult;
  }

  if (contextResult.data.group.status !== "open") {
    return buildActionError("forbidden", "Cart can only be modified while the group is open.");
  }

  const targetParticipantResult = await getParticipantById(validation.data.targetParticipantId);
  if (!targetParticipantResult.ok) {
    return targetParticipantResult;
  }

  if (targetParticipantResult.data.group_id !== validation.data.groupId) {
    return buildActionError("forbidden", "Target participant does not belong to this group.");
  }

  if (
    !canActorMutateTarget(
      contextResult.data.requester.is_host,
      contextResult.data.requester.id,
      validation.data.targetParticipantId
    )
  ) {
    return buildActionError("forbidden", "Guests can only modify their own cart items.");
  }

  const supabase = createSupabaseServerClient();
  const menuItemQuery = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", validation.data.menuItemId)
    .maybeSingle();

  if (menuItemQuery.error) {
    return buildActionError("database_error", menuItemQuery.error.message);
  }
  if (!menuItemQuery.data) {
    return buildActionError("not_found", "Menu item not found.");
  }

  const upsertResult = await supabase
    .from("cart_items")
    .upsert(
      {
        group_id: validation.data.groupId,
        participant_id: validation.data.targetParticipantId,
        menu_item_id: validation.data.menuItemId,
        quantity: validation.data.quantity
      },
      { onConflict: "participant_id,menu_item_id" }
    )
    .select("*")
    .single();

  if (upsertResult.error) {
    return buildActionError("database_error", upsertResult.error.message);
  }

  return {
    ok: true,
    data: toCartItem(upsertResult.data)
  };
}

export async function removeCartItem(
  input: RemoveCartItemInput
): Promise<ActionResult<RemoveCartItemPayload>> {
  const validation = validateRemoveCartItemInput(input);
  if (!validation.ok) {
    return validation;
  }

  const contextResult = await getGroupAndRequester(
    validation.data.groupId,
    validation.data.actorParticipantId
  );
  if (!contextResult.ok) {
    return contextResult;
  }

  if (contextResult.data.group.status !== "open") {
    return buildActionError("forbidden", "Cart can only be modified while the group is open.");
  }

  const supabase = createSupabaseServerClient();
  const cartItemQuery = await supabase
    .from("cart_items")
    .select("*")
    .eq("id", validation.data.cartItemId)
    .maybeSingle();

  if (cartItemQuery.error) {
    return buildActionError("database_error", cartItemQuery.error.message);
  }
  if (!cartItemQuery.data) {
    return buildActionError("not_found", "Cart item not found.");
  }

  if (cartItemQuery.data.group_id !== validation.data.groupId) {
    return buildActionError("forbidden", "Cart item does not belong to this group.");
  }

  if (
    !canActorMutateTarget(
      contextResult.data.requester.is_host,
      contextResult.data.requester.id,
      cartItemQuery.data.participant_id
    )
  ) {
    return buildActionError("forbidden", "Guests can only remove their own cart items.");
  }

  const deleteResult = await supabase
    .from("cart_items")
    .delete()
    .eq("id", validation.data.cartItemId)
    .eq("group_id", validation.data.groupId);

  if (deleteResult.error) {
    return buildActionError("database_error", deleteResult.error.message);
  }

  return {
    ok: true,
    data: {
      success: true,
      cartItemId: validation.data.cartItemId
    }
  };
}

export async function getCartSnapshotForHydration(
  input: GetCartSnapshotInput
): Promise<CartSnapshot> {
  const result = await getCartSnapshot(input);
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}
