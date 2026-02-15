"use client";

import { Button } from "@/components/ui/button";
import type { Participant } from "@/types/domain";

import { ParticipantBadge } from "@/components/session/ParticipantBadge";

type ParticipantListProps = {
  groupId: string;
  participants: Participant[];
  isHostViewer: boolean;
};

export function ParticipantList({ groupId, participants, isHostViewer }: ParticipantListProps) {
  function handleReopen(email: string) {
    const inviteUrl = `/group/${groupId}?invite=${encodeURIComponent(email)}`;
    window.open(inviteUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="rounded-xl border border-brand-dark/20 bg-background p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-brand-dark">Participants ({participants.length}/3)</h3>

      <ul className="mt-3 space-y-2">
        {participants.map((participant) => (
          <li
            key={participant.id}
            className="flex flex-col gap-2 rounded-md border border-brand-dark/10 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <ParticipantBadge email={participant.email} isHost={participant.isHost} />
            {isHostViewer && !participant.isHost ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleReopen(participant.email)}
              >
                Re-open Tab
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
