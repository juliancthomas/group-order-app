import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { IdentityRevalidator } from "@/components/session/IdentityRevalidator";
import { getGroupById, getGroupParticipantContext, toGroup, toParticipant } from "@/server/actions/groups";
import { joinOrResumeParticipant } from "@/server/actions/participants";
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
        <div className="mt-4 grid gap-2 text-sm text-brand-dark/80 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-brand-dark">Group ID:</span> {group.id}
          </p>
          <p>
            <span className="font-semibold text-brand-dark">Status:</span> {group.status}
          </p>
          <p>
            <span className="font-semibold text-brand-dark">Participant:</span> {participant.email}
          </p>
          <p>
            <span className="font-semibold text-brand-dark">Role:</span>{" "}
            {participant.isHost ? "Host" : "Guest"}
          </p>
        </div>
      </header>

      <section className="mt-6 rounded-xl border border-brand-dark/20 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-brand-dark">Session initialized</h2>
        <p className="mt-2 text-sm text-brand-dark/80">
          Route guards and participant identity revalidation are active. Menu and cart composition
          are added in upcoming steps.
        </p>
      </section>
    </main>
  );
}
