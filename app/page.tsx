import { redirect } from "next/navigation";

import { createGroupWithHost } from "@/server/actions/groups";

type HomePageProps = {
  searchParams?: Promise<{
    group?: string | string[];
    invite?: string | string[];
  }>;
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

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const inviteGroup = readParam(resolvedSearchParams?.group);
  const inviteEmail = readParam(resolvedSearchParams?.invite);

  if (inviteGroup && inviteEmail) {
    redirect(`/group/${inviteGroup}?invite=${encodeURIComponent(inviteEmail)}`);
  }

  const bootstrap = await createGroupWithHost({
    hostEmail: "host@hawks.demo"
  });

  if (!bootstrap.ok) {
    throw new Error(bootstrap.error.message);
  }

  redirect(
    `/group/${bootstrap.data.group.id}?participant=${bootstrap.data.participant.id}`
  );
}
