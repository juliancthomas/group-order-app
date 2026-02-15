"use client";

import { useEffect } from "react";

type IdentityRevalidatorProps = {
  groupId: string;
  participantId: string;
  email: string;
  isHost: boolean;
};

const STORAGE_KEY = "hawks.participant";

export function IdentityRevalidator({
  groupId,
  participantId,
  email,
  isHost
}: IdentityRevalidatorProps) {
  useEffect(() => {
    const nextIdentity = {
      groupId,
      participantId,
      email,
      isHost
    };

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIdentity));
        return;
      }

      const current = JSON.parse(raw) as Partial<typeof nextIdentity>;
      const hasMismatch =
        current.groupId !== nextIdentity.groupId ||
        current.participantId !== nextIdentity.participantId ||
        current.email !== nextIdentity.email ||
        current.isHost !== nextIdentity.isHost;

      if (hasMismatch) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIdentity));
      }
    } catch {
      // localStorage can fail in strict browser modes; ignore safely.
    }
  }, [email, groupId, isHost, participantId]);

  return null;
}
