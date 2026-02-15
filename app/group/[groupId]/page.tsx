import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MenuListServer } from "@/components/menu/MenuList.server";
import { IdentityRevalidator } from "@/components/session/IdentityRevalidator";
import { InviteFriendDialog } from "@/components/session/InviteFriendDialog";
import { ParticipantBadge } from "@/components/session/ParticipantBadge";
import { ParticipantList } from "@/components/session/ParticipantList";
import { getGroupById, getGroupParticipantContext, toGroup, toParticipant } from "@/server/actions/groups";
import { joinOrResumeParticipant, listParticipants } from "@/server/actions/participants";
import { isUuid } from "@/server/validators/session";

type GroupPageProps = {
  params: {
    groupId: string;
  };
  searchParams?: {
    invite?: string | string[];
    participant?: string | string[];
  };
};

function readParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value) && value.length > 0) {
    const first = value[0]?.trim();
    return first ? first : null;
  }

  return null;
}

function isLikelyGroupFull(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("maximum of 3 participants") || normalized.includes("group is not open");
}

function InvalidInviteState({ groupId }: { groupId: string }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-xl border border-brand-dark/20 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-dark">Invalid or expired invite</h1>
        <p className="mt-3 text-brand-dark/80">
          We could not resolve a valid participant session for this group link.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white"
          >
            Start a new group
          </Link>
          <Link
            href={`/group/${groupId}`}
            className="rounded-md border border-brand-dark/30 px-4 py-2 text-sm font-medium text-brand-dark"
          >
            Retry this group page
          </Link>
        </div>
      </section>
    </main>
  );
}

function MenuFallback() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-brand-dark">Menu</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            key={`menu-skeleton-${index}`}
            className="overflow-hidden rounded-xl border border-brand-dark/20 bg-background shadow-sm"
          >
            <div className="aspect-[16/10] w-full animate-pulse bg-brand-dark/10" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-brand-dark/10" />
              <div className="h-3 w-full animate-pulse rounded bg-brand-dark/10" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-brand-dark/10" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const groupId = params.groupId;
  if (!isUuid(groupId)) {
    notFound();
  }

  const groupResult = await getGroupById(groupId);
  if (!groupResult.ok) {
    if (groupResult.error.code === "not_found") {
      notFound();
    }
    throw new Error(groupResult.error.message);
  }

  const inviteEmail = readParam(searchParams?.invite);
  if (inviteEmail) {
    const joinResult = await joinOrResumeParticipant({ groupId, email: inviteEmail });
    if (!joinResult.ok) {
      if (joinResult.error.code === "forbidden" || isLikelyGroupFull(joinResult.error.message)) {
        redirect(`/full?group=${groupId}`);
      }
      return <InvalidInviteState groupId={groupId} />;
    }

    redirect(`/group/${groupId}?participant=${joinResult.data.participant.id}`);
  }

  const participantId = readParam(searchParams?.participant);
  if (!participantId || !isUuid(participantId)) {
    return <InvalidInviteState groupId={groupId} />;
  }

  const contextResult = await getGroupParticipantContext(groupId, participantId);
  if (!contextResult.ok) {
    if (contextResult.error.code === "not_found" || contextResult.error.code === "forbidden") {
      return <InvalidInviteState groupId={groupId} />;
    }
    throw new Error(contextResult.error.message);
  }

  const group = toGroup(contextResult.data.group);
  const participant = toParticipant(contextResult.data.participant);
  const participantsResult = await listParticipants({ groupId });
  if (!participantsResult.ok) {
    throw new Error(participantsResult.error.message);
  }

  const participants = participantsResult.data;
  const isHostViewer = participant.isHost;
  const inviteDisabled = participants.length >= 3;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
      <IdentityRevalidator
        groupId={group.id}
        participantId={participant.id}
        email={participant.email}
        isHost={participant.isHost}
      />

      <header className="rounded-xl border border-brand-dark/20 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
          Group Session
        </p>
        <h1 className="mt-2 text-2xl font-bold text-brand-dark">Hawks Group Order</h1>
        <div className="mt-3">
          <ParticipantBadge email={participant.email} isHost={participant.isHost} />
        </div>
        <div className="mt-4 grid gap-2 text-sm text-brand-dark/80 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-brand-dark">Group ID:</span> {group.id}
          </p>
          <p>
            <span className="font-semibold text-brand-dark">Status:</span> {group.status}
          </p>
          <p>
            <span className="font-semibold text-brand-dark">Role:</span>{" "}
            {participant.isHost ? "Host" : "Guest"}
          </p>
        </div>
      </header>

      <section className="mt-6 grid gap-4">
        <ParticipantList groupId={group.id} participants={participants} isHostViewer={isHostViewer} />
        {isHostViewer ? <InviteFriendDialog groupId={group.id} disabled={inviteDisabled} /> : null}
      </section>

      <section className="mt-6">
        <Suspense fallback={<MenuFallback />}>
          <MenuListServer />
        </Suspense>
      </section>
    </main>
  );
}
